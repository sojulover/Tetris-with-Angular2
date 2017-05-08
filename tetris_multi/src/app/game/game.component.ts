import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { AppComponent } from "../app.component";
import { ActivatedRoute, Router, Params, NavigationStart } from "@angular/router";

import { Game } from '../tetris/game';
import { Map } from '../tetris/map';

@Component(
{
  selector: 'multi',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css', '../xeicon.min.css'],
  host: { '(document: keydown)': 'keyDownEvent($event)' }
})

export class GameComponent
{
  game: any;
  constructor(private appComponent: AppComponent,
              private route: ActivatedRoute,
              private router: Router)
  {
    if(this.appComponent.user.nickname == '')
    {
      this.router.navigate(['/']);
      return;
    }
    this.router.events.filter(event => event instanceof NavigationStart).subscribe(event =>
    {
      if(event.url.indexOf('multi') < 0)
      {
        this.stopGame();
        this.appComponent.socket.emit('forceDisconnect');
      }
    });
  }
  ngOnInit(): void
  {
    this.initGame();
    // 멀티모드일 경우 서버로 부터 방정보를 얻음
    if(this.game.mode == 1)
    {
      this.appComponent.socket.emit('requestRoomInfo');
      this.appComponent.socket.on('responseRoomInfo', (response: any) =>
      {
        var room = response.roomInfo;
        var clientId = response.clientId;
        var target = document.getElementById('enemyScreen');
        for(var i = 0; i < room.players.length; i++)
        {
          if(clientId == room.players[i])
            continue;
          var tempForm: any = document.getElementById('tempForm').firstElementChild.cloneNode(true);
          tempForm.getElementsByClassName('map')[0].setAttribute('id', room.players[i]);
          target.appendChild(tempForm);
        }
      });
      this.appComponent.socket.on('startMultiGame', () =>
      {
        this.startGame();
        this.game.isGameEnded = false;
      });
      this.appComponent.socket.on('formAndScore', (response: any) =>
      {
        this.drawMap(response.sender, response.data.form);
        this.applyScore(response.sender, response.data.score);
      });
      this.appComponent.socket.on('gameEnd', (response: any) =>
      {
        this.appComponent.showMessage('게임이 종료되었습니다.');
        this.game.isReady = false;
        this.game.isGameEnded = true;
        // this.stopGame();
      });
      this.appComponent.socket.on('roomDestroyed', (response: any) =>
      {
        this.appComponent.showMessage('상대방이 방을 나갔습니다.\r\nHome 화면으로 이동합니다.');
        this.appComponent.socket.emit('forceDisconnect');
        this.router.navigate(['/home', this.appComponent.user.nickname]);
      });
    }
  }
  ngOnDestroy(): void
  {
    // this.stopGame();
    // this.appComponent.socket.emit('disconnect');
  }

  keyDownEvent(event: any): void
  {
    let game = this.game;
    if(game.flag == false)
      return;

    game.lastControllValue = event.keyCode;
    switch(event.keyCode)
    {
      case 17: // ctrl
        game.swapBlock();
        break;
      case 32: // space
        game.putBlock();
        break;
      case 37: // left arrow
        game.isMovable(game.currentBlock, game.position.row, game.position.col - 1);
        break;
      case 38: // up arrow
        var copyBlock = [];
        for(var idx in game.currentBlock)
        {
          copyBlock.push(Array.prototype.slice.call(game.currentBlock[idx]));
        }
        if(event.shiftKey)
          copyBlock = game.halfTurnBlock(copyBlock);
        else
          copyBlock = game.turnBlock(copyBlock);
        if(game.isMovable(copyBlock, game.position.row, game.position.col) ||
          game.isMovable(copyBlock, game.position.row, game.position.col +  Math.abs(game.currentBlock.length - game.currentBlock[0].length)) ||
          game.isMovable(copyBlock, game.position.row, game.position.col -  Math.abs(game.currentBlock.length - game.currentBlock[0].length)))
          game.currentBlock = copyBlock;
        break;
      case 39: // right arrow
        game.isMovable(game.currentBlock, game.position.row, game.position.col + 1);
        break;
      case 40: // down arrow
        game.downBlock();
        break;
    }
    this.drawMap(game.map.target, game.map.form);
    this.drawBlock(game.map.target, game.currentBlock, game.position.row, game.position.col);
    this.drawPreviewBlock('previewCurrent', game.currentBlock);
    this.drawPreviewBlock('previewNext', game.nextBlock);

    if(game.mode == 1)
      this.sendFormAndScore();
  }
  sendFormAndScore()
  {
    this.appComponent.socket.emit('sendFormAndScore', {form: this.game.map.form, score: this.game.score});
  }
  applyScore(target: string, score: number)
  {
    document.getElementById(target).parentElement.getElementsByClassName('score')[0].innerHTML = score.toString();
  }
  drawPreviewBlock(target: any, block: any): void
  {
    var tempBlock = document.getElementById(target);
    tempBlock.innerHTML = '';
    for(var i = 0; i < block.length; i++)
    {
      var tempRow = document.createElement('div');
      tempRow.classList.add('row');
      for(var j = 0; j < block[0].length; j++)
      {
        var tempCol = document.createElement('div');
        tempRow.appendChild(tempCol);
        if(block[i][j] != null)
        {
          tempCol.classList.add('col');
          tempCol.style.backgroundColor = block[i][j].color;
          tempCol.style.border = '4px outset ' + block[i][j].color;
        }
      }
      tempBlock.appendChild(tempRow);
    }
    if(block.length == 4)
    {
      tempBlock.style.marginBottom = '25px';
    }
  }
  initGame(): void
  {
    document.getElementById('score').innerText = '0';
    document.getElementById('combo').innerText = '0';
    document.getElementById('currentBlock').innerHTML = '';
    this.game = new Game();
    this.game.map = new Map('map', 20, 10);
    this.game.map.initMap();
    // url에 single이 있을 경우 mode는 0, 아닐 경우 1(추후 수정 해야 함)
    this.game.mode = this.router.url.indexOf('single') > 0 ? 0: 1;
    if(this.game.mode == 0)
      this.game.level = this.route.params.subscribe((params: Params) => params['level']);
  }
  readyGame(): void
  {
    this.initGame();
    this.game.isReady = true;
    if(this.game.mode == 1)
    {
      this.appComponent.socket.emit('ready');
    }
  }
  unReadyGame(): void
  {
    this.game.isReady = false;
    this.appComponent.socket.emit('unready');
  }
  startGame(): void
  {
    if(this.game.mode == 0)
      this.initGame();
    this.game.flag = true;
    this.game.currentBlock = this.game.createBlock();
    this.game.nextBlock = this.game.createBlock();
    this.drawPreviewBlock('previewCurrent', this.game.currentBlock);
    this.drawPreviewBlock('previewNext', this.game.nextBlock);
    this.game.autoDownInterval.id = setInterval(this.autoDownInterval.bind(this), this.game.autoDownInterval.term);
    this.game.hurdleInterval.id = setInterval(this.hurdleInterval.bind(this), this.game.hurdleInterval.term);
    this.game.scoreInterval.id = setInterval(this.scoreInterval.bind(this), this.game.scoreInterval.term);
  }
  stopGame(): void
  {
    this.game.flag = false;
    clearInterval(this.game.autoDownInterval.id);
    clearInterval(this.game.hurdleInterval.id);
    clearInterval(this.game.scoreInterval.id);
    if(this.game.mode == 1)
    {
      console.log('player die');
      this.appComponent.socket.emit('playerDie');
    }
  }
  drawMap(target: any, form: any): void
  {
    var fragment = document.createDocumentFragment();
    var borderWeight = target == this.game.map.target ? 4 : 3;	// style: block-border-weight value.
    for(var i = 0; i < this.game.map.rowSize; i++)
    {
      var rowHtml = document.createElement('div');
      rowHtml.classList.add('row');
      for(var j = 0; j < this.game.map.colSize; j++)
      {
        var colHtml = document.createElement('div');
        colHtml.classList.add('col');
        if(form[i][j] != null)
        {
          colHtml.style.border = borderWeight + 'px outset' + form[i][j].color;
          colHtml.style.backgroundColor = form[i][j].color;
          colHtml.setAttribute('data-index', form[i][j].blockIndex);
        }
        else
        {
          colHtml.style.border = '1px dotted #747474';
        }
        rowHtml.appendChild(colHtml);
      }
      fragment.appendChild(rowHtml);
    }

    document.getElementById(target).innerHTML = '';
    document.getElementById(target).appendChild(fragment);

    if(this.game.flag == false)
    {
      this.stopGame();
    }
  }
  drawBlock(target: any, block: any, row: any, col: any): void
  {
    var startIdx = 0;
    var currentBlock = document.getElementById('currentBlock');
    currentBlock.innerHTML = '';
    if(row < 0)
    {
      startIdx = Math.abs(row);
      row = 0;
    }

    for(var i = startIdx; i < block.length; i++)
    {
      var tempRow = document.createElement('div');
      tempRow.classList.add('row');
      for(var j = 0; j < block[0].length; j++)
      {
        var tempCol = document.createElement('div');
        tempCol.classList.add('col');
        tempRow.appendChild(tempCol);
        if(block[i][j] != null)
        {
          tempCol.style.backgroundColor = block[i][j].color;
          tempCol.style.border = '4px outset ' + block[i][j].color;
        }
      }
      currentBlock.appendChild(tempRow);
    }
    var row: any = document.getElementById(target).getElementsByClassName('row')[row].getElementsByClassName('col')[col];
    var left = row.offsetLeft;
    var top = row.offsetTop;
    currentBlock.style.left = left + 'px';
    currentBlock.style.top = top + 'px';
  }
  autoDownInterval(): void
  {
    this.game.downBlock();
    this.drawMap(this.game.map.target, this.game.map.form);
    this.drawBlock(this.game.map.target, this.game.currentBlock, this.game.position.row, this.game.position.col);
  }
  hurdleInterval(): void
  {
    let game = this.game;
    if(game.position.row < 0)
    {
      var rowIdx = Math.abs(game.position.row);
      for(var i = 0; i < game.currentBlock[rowIdx].length; i++)
      {
        if(game.currentBlock[rowIdx][i] != null && game.map.form[rowIdx][i + game.position.col] != null)
        {
          this.game.gameOver();
        }
      }
    }
    for(var idx in game.map.form[0])
    {
      if(game.map.form[0][idx] != null)
      {
        this.game.gameOver();
      }
    }
    var tempRow = [];
    var tempRowHtml = document.createElement('div');
    tempRowHtml.classList.add('row');
    for(var i = 0; i < game.map.colSize; i++)
    {
      var tempColHtml = document.createElement('div');
      tempColHtml.classList.add('col');
      tempRowHtml.appendChild(tempColHtml);
      var tempCol = null;
      if(Math.round(Math.random() * 1.5))
      {
        tempCol = { blockIndex: -1, color: '#bdbdbd' };
        tempColHtml.style.backgroundColor = tempCol.color;
        tempColHtml.style.border = '4px outset ' + tempCol.color;
        tempColHtml.setAttribute('data-index', tempCol.blockIndex.toString());
      }
      tempRow.push(tempCol);
    }
    game.map.form.shift();
    game.map.form.push(tempRow);
    document.getElementById(game.map.target).removeChild(document.getElementById(game.map.target).firstChild);
    document.getElementById(game.map.target).appendChild(tempRowHtml);
    clearInterval(game.hurdleInterval.id);
    game.hurdleInterval.term -= 250;
    game.hurdleInterval.id = setInterval(this.hurdleInterval.bind(this), this.game.hurdleInterval.term);
  }
  scoreInterval(): void
  {
    let game = this.game;
    game.score += 10;
    document.getElementById('score').innerText = (game.score.toString()).replace(/(\d)(?=(?:\d{3})+(?!\d))/g,'$1,');
    // choose max combo icon.
    var comboIcon = 'xi-emoticon-bad-o';
    switch(game.maxCombo)
    {
      case 0:
        comboIcon = 'xi-emoticon-bad-o';
        break;
      case 1:
        comboIcon = 'xi-emoticon-sad-o';
        break;
      case 2:
        comboIcon = 'xi-emoticon-neutral-o';
        break;
      case 3:
        comboIcon = 'xi-emoticon-happy-o';
        break;
      case 4:
        comboIcon = 'xi-emoticon-o';
        break;
      case 5:
        comboIcon = 'xi-emoticon-cool-o';
        break;
      case 6:
        comboIcon = 'xi-emoticon-cool';
        break;
      case 7:
        comboIcon = 'xi-star-o';
        break;
      case 8:
        comboIcon = 'xi-trophy';
        break;
      case 9:
        comboIcon = 'xi-crown';
        break;
    }
    document.getElementById('comboIcon').className = '';
    document.getElementById('comboIcon').classList.add('xi-2x');
    document.getElementById('comboIcon').classList.add(comboIcon);
  }
}