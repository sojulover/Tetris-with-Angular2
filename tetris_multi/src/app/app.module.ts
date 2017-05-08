import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutesModule } from './app.routes.module';

import { AppComponent } from './app.component';
import { UserComponent } from './user/user.component';
import { HomeComponent } from './home/home.component';
import { GameComponent } from "./game/game.component";

@NgModule(
{
  imports:
  [
    BrowserModule,
    FormsModule,
    AppRoutesModule
  ],
  declarations:
  [
    AppComponent,
    UserComponent,
    HomeComponent,
    GameComponent
  ],
  providers:
  [
  ],
  bootstrap:
  [
    AppComponent
  ]
})

export class AppModule { }