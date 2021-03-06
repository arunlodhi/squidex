/*
 * Squidex Headless CMS
 *
 * @license
 * Copyright (c) Squidex UG (haftungsbeschränkt). All rights reserved.
 */

import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { distinctUntilChanged, map, tap } from 'rxjs/operators';

import {
    DialogService,
    ImmutableArray,
    notify,
    State
} from '@app/framework';

import {
    AppDto,
    AppsService,
    CreateAppDto
} from './../services/apps.service';

interface Snapshot {
    // All apps, loaded once.
    apps: ImmutableArray<AppDto>;

    // The selected app.
    selectedApp: AppDto | null;
}

function sameApp(lhs: AppDto, rhs?: AppDto): boolean {
    return lhs === rhs || (!!lhs && !!rhs && lhs.id === rhs.id);
}

@Injectable()
export class AppsState extends State<Snapshot> {
    public get appName() {
        return this.snapshot.selectedApp ? this.snapshot.selectedApp.name : '';
    }

    public selectedApp =
        this.changes.pipe(map(s => s.selectedApp),
            distinctUntilChanged(sameApp));

    public apps =
        this.changes.pipe(map(s => s.apps),
            distinctUntilChanged());

    constructor(
        private readonly appsService: AppsService,
        private readonly dialogs: DialogService
    ) {
        super({ apps: ImmutableArray.empty(), selectedApp: null });
    }

    public select(name: string | null): Observable<AppDto | null> {
        const observable =
            !name ?
                of(null) :
                of(this.snapshot.apps.find(x => x.name === name) || null);

        return observable.pipe(
            tap(selectedApp => {
                this.next(s => ({ ...s, selectedApp }));
            }));
    }

    public load(): Observable<any> {
        return this.appsService.getApps().pipe(
            tap((dto: AppDto[]) => {
                this.next(s => {
                    const apps = ImmutableArray.of(dto);

                    return { ...s, apps };
                });
            }));
    }

    public create(request: CreateAppDto): Observable<AppDto> {
        return this.appsService.postApp(request).pipe(
            tap(dto => {
                this.next(s => {
                    const apps = s.apps.push(dto).sortByStringAsc(x => x.name);

                    return { ...s, apps };
                });
            }));
    }

    public delete(name: string): Observable<any> {
        return this.appsService.deleteApp(name).pipe(
            tap(() => {
                this.next(s => {
                    const apps = s.apps.filter(x => x.name !== name);

                    const selectedApp = s.selectedApp && s.selectedApp.name === name ? null : s.selectedApp;

                    return { ...s, apps, selectedApp };
                });
            }),
            notify(this.dialogs));
    }
}