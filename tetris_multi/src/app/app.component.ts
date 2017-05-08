import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import * as io from 'socket.io-client';

import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

@Component(
{
  selector: 'app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css', './xeicon.min.css' ]
})

export class AppComponent
{
  isGnbShow: boolean = false;
  message: string = '';
  user: any = {nickname: ''};
  socket: any = null;

  constructor(private router: Router)
  {
    this.user.nickname = '';
  }

  ngOnInit(): void
  {}
  showMessage(message: string): void
  {
    this.message = message;

    let timer = Observable.timer(2000);
    timer.subscribe(t=>{this.message = '';});
  }
  toggleGnb(): void
  {
    this.isGnbShow = !this.isGnbShow;
  }
}