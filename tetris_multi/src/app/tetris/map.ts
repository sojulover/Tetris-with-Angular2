export class Map
{
  target: string;
  rowSize: number;
  colSize: number;
  form: any = null;

  constructor(target: string, rowSize: number, colSize: number)
  {
    this.target = target || 'map';
    this.rowSize = rowSize || 20;
    this.colSize = colSize || 10;
    this.form = [];
  }

  emptyMap(): void
  {
    var target = document.getElementById(this.target);

    while(target.children[0])
      target.removeChild(target.children[0]);

    this.form = [];
  }
  drawMap(): void
  {
    var fragment = document.createDocumentFragment();
    for(var i = 0; i < this.rowSize; i++)
    {
      var row = [];
      var rowHtml = document.createElement('div');
      rowHtml.classList.add('row');
      for(var j = 0; j < this.colSize; j++)
      {
        row.push(null);
        var colHtml = document.createElement('div');
        colHtml.classList.add('col');
        rowHtml.appendChild(colHtml);
      }
      this.form.push(row);
      fragment.appendChild(rowHtml);
    }
    document.getElementById(this.target).appendChild(fragment);
  }
  initMap(): void
  {
    this.emptyMap();
    this.drawMap();
  }
}