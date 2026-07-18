import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  template: '<main><h1>Angular prototype</h1></main>',
})
class App {}

void bootstrapApplication(App);
