import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { AppComponent } from '../app.component';

@Component(
  {
    selector: 'home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css', '../xeicon.min.css']
  })

export class HomeComponent
{
  isQueueSpinnerShow: boolean = false;
  playersText: string = '';
  url = 'http://localhost:8081';

  constructor(private appComponent: AppComponent,
              private route: ActivatedRoute,
              private router: Router)
  {
    this.route.params.subscribe((params: Params) => this.appComponent.user.nickname = params['nickname']);
    if(this.appComponent.user.nickname == '')
    {
      this.router.navigate(['/']);
      return;
    }
    this.appComponent.socket = io(this.url);
    this.appComponent.socket.on('responseRoomInfo', (data: any) =>
    {
      this.playersText = data.currentUserCount + '/' + data.maxUserCount;
    });
    this.appComponent.socket.on('standby', () =>
    {
      this.router.navigate(['/multi']);
    });
  }

  ngOnInit()
  {
  }
  singleStart(level: number): void
  {
    this.router.navigate(['/single', level]);
  }
  joinQueue(maxUserCount: number): void
  {
    this.isQueueSpinnerShow = true;
    this.appComponent.socket.emit('joinQueue', {maxUserCount: maxUserCount});
  }
  exitQueue(): void
  {
    this.isQueueSpinnerShow = false;
    this.appComponent.socket.emit('exitQueue');
  }
}