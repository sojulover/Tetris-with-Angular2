import { Component, OnInit } from '@angular/core';
import { AppComponent } from "../app.component";

import { Router } from "@angular/router";

@Component(
{
  selector: 'user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})

export class UserComponent
{
  user: any = {nickname : ''};
  constructor(private appComponent: AppComponent, private router: Router)
  {
    this.appComponent.user.nickname = '';
    if(this.appComponent.socket != null)
    {
      this.appComponent.socket.emit('forceDisconnect');
    }
  }
  ngOnInit()
  {
  }

  startGame(): void
  {
    if(this.user.nickname == '')
    {
      this.appComponent.showMessage('wrong nickname');
      return;
    }
    else
    {
      this.router.navigate(['/home', this.user.nickname]);
    }
  }
}