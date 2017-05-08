import { Component } from '@angular/core';

@Component(
{
  selector: 'post',
  template: '<h2>{{title}}</h2>'
})

export class PostComponent
{
  title = 'post';
}