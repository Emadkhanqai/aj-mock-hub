import { Component, output } from '@angular/core';

@Component({
  selector: 'app-boot-splash',
  templateUrl: './boot-splash.component.html',
  styleUrl: './boot-splash.component.scss',
})
export class BootSplashComponent {
  readonly finished = output<void>();

  protected finish(event: AnimationEvent) {
    if (event.target === event.currentTarget) {
      this.finished.emit();
    }
  }
}
