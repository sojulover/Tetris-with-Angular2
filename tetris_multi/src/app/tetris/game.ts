export class Game
{
  mode: number = 0;										      // game mode(SINGLE: 0, MULTI: 1)
  level: number = 0;                        // game level(easy: 0, normal: 1, hard: 2)
  map: any = null;												  // root element
  flag: boolean = false;										// game flag: true=live, false=die.
  isReady: boolean = false;                 // game ready flag
  nextBlock: any = null;									  // next block
  currentBlock: any = null;								  // current block
  blockIndex: number = 0;										// block index
  position: any = {col: 0, row: 0};				  // current block position.
  score: number = 0;
  isCombo: boolean = false;									// combo flag
  combo: number = 0;												// combo count
  maxCombo: number = 0;											// max combo
  isGameEnded = true;
  scoreInterval: any =
  {
    id: 0,
    term: 2000
  };
  autoDownInterval: any =
  {
    id: 0,
    term: 1000
  };
  hurdleInterval: any =
  {
    id: 0,
    term: 15000
  };

  createBlock(): any
  {
    var block = BLOCK_FORMS[Math.floor(Math.random() * BLOCK_FORMS.length)];
    var form = block.form;
    var properties = {blockIndex: this.blockIndex++, color: block.color};
    var result = [];
    for(var idx in form)
    {
      result.push(form[idx].map(function(col)
      {
        if(col != 0)
          return properties;
        else
          return null;
      }));
    }
    if(this.currentBlock != null)
    {
      this.position.col = 4;
      this.position.row = 0 - this.currentBlock.length;
    }
    return result;
  }
  isMovable(block: any, row: number, col: number): boolean
  {
    var startIdx = 0;
    var rowIdx = row;
    var colIdx = col;
    // out of range - return false.
    if(col < 0)
      return false;
    if((col + block[0].length) > this.map.colSize)
      return false;
    if((row + block.length) > this.map.rowSize)
      return false;
    if(row + block.length == 0)
    {
      this.position.row = row;
      this.position.col = col;
      return true;
    }
    // if there is a part of block over the map, change startIdx from 0 to that value.
    if(row < 0)
      startIdx = Math.abs(row);

    for(var i = startIdx; i < block.length; i++)
    {
      for(var j = 0; j < block[0].length; j++)
      {
        if(block[i][j] != null && this.map.form[i + rowIdx][j + colIdx] != null)
          return false;
      }
    }
    this.position.row = row;
    this.position.col = col;
    return true;
  }
  buildBlock(): boolean
  {
    var startIdx = 0;
    var position = this.position;
    var block = this.currentBlock;
    // build block
    if(this.position.row < 0)
      startIdx = Math.abs(this.position.row);
    for(var i = startIdx; i < block.length; i++)
    {
      var mapRow = this.map.form[i + position.row];
      for(var j = 0; j < block[0].length; j++)
      {
        if(block[i][j] != null)
        {
          mapRow[j + position.col] = block[i][j];
        }
      }
    }
    if(this.position.row < 0)
    {
      this.gameOver();
      return false;
    }

    // Calculate combo and score.
    this.currentBlock = this.nextBlock;
    this.nextBlock = this.createBlock();
    this.isCombo = false;

    for(var i = 0; i < this.map.rowSize; i++)
    {
      var isBreak = true;
      for(var j = 0; j < this.map.colSize; j++)
      {
        if(this.map.form[i][j] == null)
        {
          isBreak = false;
          break;
        }
      }
      if(isBreak == true)
      {
        this.isCombo = true;
        this.score += 100;
        var tempRowArray = [];
        var tempRow = document.createElement('div');
        tempRow.classList.add('row');
        for(var idx = 0; idx < this.map.colSize; idx++)
        {
          tempRowArray.push(null);
          var tempCol = document.createElement('div');
          tempCol.classList.add('col');
          tempRow.appendChild(tempCol);
        }
        this.map.form.splice(i, 1);
        this.map.form.unshift(tempRowArray);
        document.getElementById(this.map.target).removeChild(document.getElementById(this.map.target).children[i]);
        document.getElementById(this.map.target).insertBefore(tempRow, document.getElementById(this.map.target).children[0]);
      }
    }
    // If the combo larger than 1, add bonus score.
    if(this.isCombo && ++this.combo > 1)
    {
      if(this.combo > this.maxCombo)
        this.maxCombo = this.combo;
      this.score += Math.round(this.combo * (100 * (1 + (this.combo / 10))));

      document.getElementById('score').innerText = (this.score + '').replace(/(\d)(?=(?:\d{3})+(?!\d))/g,'$1,');
      document.getElementById('combo').innerText = this.combo + '';
    }
    else if(!this.isCombo)
    {
      // Init combo
      this.combo = 0;
    }
  }
  downBlock(): void
  {
    if(!this.isMovable(this.currentBlock, this.position.row + 1, this.position.col))
    {
      this.buildBlock();
    }
  }
  putBlock(): void
  {
    while(true)
    {
      if(!this.isMovable(this.currentBlock, this.position.row + 1, this.position.col))
      {
        this.buildBlock();
        break;
      }
    }
  }
  swapBlock(): void
  {
    var tempBlock = this.currentBlock;
    this.currentBlock = this.nextBlock;
    this.nextBlock = tempBlock;
  }
  turnBlock(block: any): any
  {
    var turnedBlock = [];
    for(var i = 0; i < block[0].length; i++)
    {
      var tempRow = [];
      for(var j = block.length - 1; j > -1; j--)
      {
        tempRow.push(block[j][i]);
      }
      turnedBlock.push(tempRow);
    }
    return turnedBlock;
  }
  halfTurnBlock(block: any)
  {
    var turnedBlock = [];
    for(var i = block[0].length - 1; i > - 1; i--)
    {
      var tempRow = [];
      for(var j = 0; j < block.length; j++)
      {
        tempRow.push(block[j][i]);
      }
      turnedBlock.push(tempRow);
    }
    return turnedBlock;
  }
  gameOver(): void
  {
    this.flag = false;
  }
  printMap(): void
  {
    var text = '';
    for(var rowIdx = 0; rowIdx < this.map.rowSize; rowIdx++)
    {
      var targetRow = this.map.form[rowIdx];
      for(var colIdx = 0; colIdx < this.map.colSize; colIdx++)
      {
        var target = targetRow[colIdx] != null ? "*" :  " ";
        text += target;
      }
      text += "\r\n";
    }
    console.log(text);
  }
}
var BLOCK_FORMS =
  [
    {
      form:
        [
          [ 0, 1 ],
          [ 1, 1 ],
          [ 1, 0 ]
        ],
      color: '#ff0000'
    },
    {
      form:
        [
          [ 1, 1 ],
          [ 0, 1 ],
          [ 0, 1 ]
        ],
      color: '#ff9436'
    },
    {
      form:
        [
          [ 1, 1 ],
          [ 1, 1 ]
        ],
      color: '#ffe400'
    },
    {
      form:
        [
          [ 1, 0 ],
          [ 1, 1 ],
          [ 0, 1 ]
        ],
      color: '#32cd32'
    },
    {
      form:
        [
          [ 1 ],
          [ 1 ],
          [ 1 ],
          [ 1 ]
        ],
      color: '#0000ff'
    },
    {
      form:
        [
          [ 1, 1 ],
          [ 1, 0 ],
          [ 1, 0 ]
        ],
      color: '#000080'
    },
    {
      form:
        [
          [ 1, 0 ],
          [ 1, 1 ],
          [ 1, 0 ]
        ],
      color: '#800080'
    }
  ];