import {
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  NavigationStart,
  Router,
  RouterModule,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private audioContext?: AudioContext;
  private soundUnlocked = false;
  private parallaxFrame?: number;
  private transitionTimer?: ReturnType<typeof setTimeout>;

  @ViewChild('sceneStage') private sceneStage?: ElementRef<HTMLElement>;
  @ViewChild('ambientOne') private ambientOne?: ElementRef<HTMLElement>;
  @ViewChild('ambientTwo') private ambientTwo?: ElementRef<HTMLElement>;

  protected readonly title = 'AJ Mock Hub';
  protected readonly routeEntering = signal(false);
  protected readonly soundEnabled = signal(
    typeof localStorage === 'undefined' ||
      localStorage.getItem('aj-mock-hub:sound') !== 'off',
  );

  constructor() {
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

  protected moveParallax(event: PointerEvent) {
    if (
      !matchMedia('(hover: hover) and (pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    if (this.parallaxFrame) cancelAnimationFrame(this.parallaxFrame);
    this.parallaxFrame = requestAnimationFrame(() => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      if (this.sceneStage) {
        this.sceneStage.nativeElement.style.transform = `perspective(1400px) rotateX(${(-y * 0.7).toFixed(2)}deg) rotateY(${(x * 0.9).toFixed(2)}deg)`;
      }
      if (this.ambientOne) {
        this.ambientOne.nativeElement.style.translate = `${(x * 32).toFixed(1)}px ${(y * 24).toFixed(1)}px`;
      }
      if (this.ambientTwo) {
        this.ambientTwo.nativeElement.style.translate = `${(-x * 22).toFixed(1)}px ${(-y * 18).toFixed(1)}px`;
      }
    });
  }

  protected resetParallax() {
    if (this.parallaxFrame) cancelAnimationFrame(this.parallaxFrame);
    if (this.sceneStage) this.sceneStage.nativeElement.style.transform = '';
    if (this.ambientOne) this.ambientOne.nativeElement.style.translate = '';
    if (this.ambientTwo) this.ambientTwo.nativeElement.style.translate = '';
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
