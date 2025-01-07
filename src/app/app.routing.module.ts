import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { BasePageComponent } from "./base-page/base-page.component";
import { canActivate } from "./services/role.guard";
import { environment } from "../environments/environment";

const routes: Routes = [
    {
        path: '',
        component: BasePageComponent,
        canActivate: environment.authEnabled ? [MsalGuard, canActivate] : [canActivate]
    },
    {
      path: 'auth-callback',
      component: BasePageComponent,
      canActivate: environment.authEnabled ? [MsalGuard] : []
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
