import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UserComponent } from "./user/user.component";
import { HomeComponent } from "./home/home.component";
import { GameComponent } from "./game/game.component";

const ROUTES: Routes =
[
  { path: '', component: UserComponent },
  { path: 'home/:nickname', component: HomeComponent },
  { path: 'multi', component: GameComponent },
  { path: 'single/:level', component: GameComponent }
];

@NgModule(
{
  imports: [ RouterModule.forRoot(ROUTES) ],
  exports: [ RouterModule ]
})

export class AppRoutesModule { }