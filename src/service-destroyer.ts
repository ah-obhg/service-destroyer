import { Injectable, OnDestroy } from "@angular/core";
import { Unsubscribable, Subject } from "rxjs";

export interface IDestroyableService {
    ngOnDestroy: () => any;
}

export interface IDisposable {
    dispose: () => any;
}

export type IDestroyable = IDestroyableService | IDisposable | Unsubscribable | Subject<any>;

/**
 * This is used destroy services that were created ad-hoc instead of being provided by a component or module
 *
 * # Usage
 *
 * - Provide the Destroyer in the component that creates the ad-hoc service
 * - When instantiating the ad-hoc service, add it to the destroyer via the watch method
 */
@Injectable()
export class ServiceDestroyer implements OnDestroy {
    protected watchedSubjects = new Set<Subject<any>>();
    protected watchedSubscriptions = new Set<Unsubscribable>();
    protected watchedDisposables = new Set<IDisposable>();
    protected watchedServices = new Set<IDestroyableService>();
    protected watchedSubscriptionsOnce = new Map<string, Unsubscribable>();

    watch<T extends IDestroyable>(...destroyables: [T, ...IDestroyable[]]): T {
        for (const destroyable of destroyables) {
            if (destroyable instanceof Subject) {
                this.watchSubjects(destroyable);
            } else if ("unsubscribe" in destroyable && typeof destroyable.unsubscribe === "function") {
                this.watchSubscription(destroyable);
            } else if ("dispose" in destroyable && typeof destroyable.dispose === "function") {
                this.watchDisposable(destroyable);
            } else if ("ngOnDestroy" in destroyable && typeof destroyable.ngOnDestroy === "function") {
                this.watchedServices.add(destroyable);
            } else {
                throw new Error("ServiceDestoryer.watch: destroyable type could not be determined.");
            }
        }
        return destroyables[0];
    }

    watchSubjects<T extends Subject<any>>(...subjects: [T, ...Subject<any>[]]): T {
        for (const subject of subjects) {
            if (subject == null) {
                throw new Error("ServiceDestoryer.watchSubjects: subject is null.");
            }
            this.watchedSubjects.add(subject);
        }
        return subjects[0];
    }

    watchSubscription<T extends Unsubscribable>(...subscriptions: [T, ...Unsubscribable[]]): T {
        for (const subscription of subscriptions) {
            if (subscription == null) {
                throw new Error("ServiceDestoryer.watchSubscription: subscription is null.");
            }
            this.watchedSubscriptions.add(subscription);
        }
        return subscriptions[0];
    }

    watchDisposable<T extends IDisposable>(...disposables: [T, ...IDisposable[]]): T {
        for (const disposable of disposables) {
            if (disposable == null) {
                throw new Error("ServiceDestoryer.watchDisposable: disposable is null.");
            }
            this.watchedDisposables.add(disposable);
        }
        return disposables[0];
    }

    watchService<T extends IDestroyableService>(...services: [T, ...IDestroyableService[]]): T {
        for (const service of services) {
            if (service == null) {
                throw new Error("ServiceDestoryer.watchService: service is null.");
            }
            this.watchedServices.add(service);
        }
        return services[0];
    }

    stopSubscriptionOnce(name: string): void {
        if (this.watchedSubscriptionsOnce.has(name)) {
            const oldSubscription = this.watchedSubscriptionsOnce.get(name);
            if (oldSubscription != null) {
                oldSubscription.unsubscribe();
            }
        }
    }

    watchSubscriptionOnce(name: string, subscription: Unsubscribable): Unsubscribable {
        if (typeof name !== "string" || name === "") {
            throw new Error("ServiceDestoryer.watchSubscriptionOnce: name is invalid.");
        }
        if (subscription == null) {
            throw new Error("ServiceDestoryer.watchSubscriptionOnce: subscription is null.");
        }
        if (subscription.unsubscribe == null) {
            throw new Error("ServiceDestoryer.watchSubscriptionOnce: subscription.unsubscribe is null.");
        }

        this.stopSubscriptionOnce(name);

        this.watchedSubscriptionsOnce.set(name, subscription);
        return subscription;
    }

    ngOnDestroy() {
        const errors: any[] = [];

        this.watchedSubjects.forEach(watchedSubject => {
            try {
                if (watchedSubject.complete != null) {
                    watchedSubject.complete();
                } else {
                    throw new Error("Object does not have complete function");
                }
            } catch (ex) {
                errors.push(ex);
            }
        });

        this.watchedSubscriptions.forEach(watchedSubscription => {
            try {
                if (watchedSubscription.unsubscribe != null) {
                    watchedSubscription.unsubscribe();
                } else {
                    throw new Error("Object does not have unsubscribe function");
                }
            } catch (ex) {
                errors.push(ex);
            }
        });

        this.watchedDisposables.forEach(watchedDisposable => {
            try {
                if (watchedDisposable.dispose != null) {
                    watchedDisposable.dispose();
                } else {
                    throw new Error("Object does not have dispose function");
                }
            } catch (ex) {
                errors.push(ex);
            }
        });

        this.watchedServices.forEach(watchedService => {
            try {
                if (watchedService.ngOnDestroy != null) {
                    watchedService.ngOnDestroy();
                } else {
                    throw new Error("Object does not have ngOnDestroy function");
                }
            } catch (ex) {
                errors.push(ex);
            }
        });

        this.watchedSubscriptionsOnce.forEach(watchedSubscription => {
            try {
                if (watchedSubscription.unsubscribe != null) {
                    watchedSubscription.unsubscribe();
                } else {
                    throw new Error("Object does not have unsubscribe function");
                }
            } catch (ex) {
                errors.push(ex);
            }
        });

        if (errors.length > 0) {
            console.error("Errors while destroying services and unsubscribing from subscriptions:", errors);
        }
    }
}
