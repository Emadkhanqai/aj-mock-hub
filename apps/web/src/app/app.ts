import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterModule,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { BootSplashComponent } from './boot-splash.component';
import { DepthSceneComponent } from './depth-scene.component';

@Component({
  imports: [BootSplashComponent, DepthSceneComponent, RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private audioContext?: AudioContext;
  private soundUnlocked = false;
  private transitionTimer?: ReturnType<typeof setTimeout>;

  protected readonly title = 'AJ Mock Hub';
  protected readonly booting = signal(true);
  protected readonly routeEntering = signal(false);
  protected readonly soundEnabled = signal(
    typeof localStorage === 'undefined' ||
      localStorage.getItem('aj-mock-hub:sound') !== 'off',
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.transitionTimer);
    });

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationStart | NavigationEnd =>
            event instanceof NavigationStart || event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.routeEntering.set(false);
          return;
        }
        this.routeEntering.set(true);
        clearTimeout(this.transitionTimer);
        this.transitionTimer = setTimeout(
          () => this.routeEntering.set(false),
          420,
        );
        this.playNavigationSound();
      });
  }

  protected unlockSound() {
    if (!this.soundEnabled() || this.soundUnlocked) return;
    this.audioContext ??= new AudioContext();
    void this.audioContext.resume();
    this.soundUnlocked = true;
  }

  protected toggleSound(event: MouseEvent) {
    event.stopPropagation();
    const enabled = !this.soundEnabled();
    this.soundEnabled.set(enabled);
    localStorage.setItem('aj-mock-hub:sound', enabled ? 'on' : 'off');
    if (enabled) {
      this.soundUnlocked = false;
      this.unlockSound();
      this.playNavigationSound();
    }
  }

  protected finishBoot() {
    this.booting.set(false);
  }

  private playNavigationSound() {
    if (!this.soundEnabled() || !this.soundUnlocked || !this.audioContext)
      return;
    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(280, now);
    oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.028, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.19);
  }
}
