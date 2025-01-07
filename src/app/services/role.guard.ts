import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  CanActivateFn,
  CanActivateChildFn
} from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { map } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { Roles } from "../lib/constants";
const getUserGroups = (http: HttpClient, account: AccountInfo) => {
  if (account) {
    http.get(`https://graph.microsoft.com/v1.0/me/memberOf`, {
      headers: {
        Authorization: `Bearer ${account.idTokenClaims?.access_token}`
      }
    }).subscribe((response: any) => {
      const userGroups = response.value.map((group: any) => group.id);
      console.log('user groups', userGroups);
    });
  }
}
export const canActivate: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  if (!environment.authEnabled) {
    route.data = {
      roles: [Roles.BUILDER, Roles.APPROVER]
    };
    return true;
  }
  const msalService = inject(MsalService);
  return msalService.handleRedirectObservable().pipe(
    map((result: AuthenticationResult | null) => {
      if (result !== null && result.account !== null) {
        msalService.instance.setActiveAccount(result.account);
      }
      const account = msalService.instance.getActiveAccount();
      if (account && account.idTokenClaims?.roles) {
        const roles = account.idTokenClaims.roles as string[];
        console.log('user roles', roles);
        if (roles && roles.length > 0) {
          route.data = {
            roles
          };
          return true;
        }
      }
      return false;
    }));
};
export const canActivateChild: CanActivateChildFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => canActivate(route, state);
