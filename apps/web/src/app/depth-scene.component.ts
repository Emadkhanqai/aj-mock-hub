import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
} from '@angular/core';

@Component({
  selector: 'app-depth-scene',
  templateUrl: './depth-scene.component.html',
  styleUrl: './depth-scene.component.scss',
  host: { 'aria-hidden': 'true' },
})
export class DepthSceneComponent {
  private readonly destroyRef = inject(DestroyRef);
  private frame?: number;
  private target = { x: 0, y: 0 };
  private position = { x: 0, y: 0 };

  @ViewChild('ambientOne') private ambientOne?: ElementRef<HTMLElement>;
  @ViewChild('ambientTwo') private ambientTwo?: ElementRef<HTMLElement>;
  @ViewChild('depthHalo') private depthHalo?: ElementRef<HTMLElement>;
  @ViewChild('gridPlane') private gridPlane?: ElementRef<HTMLElement>;
  @ViewChild('prismOne') private prismOne?: ElementRef<HTMLElement>;
  @ViewChild('prismTwo') private prismTwo?: ElementRef<HTMLElement>;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.frame) cancelAnimationFrame(this.frame);
    });
  }

  @HostListener('window:pointermove', ['$event'])
  protected move(event: PointerEvent) {
    if (
      !matchMedia('(hover: hover) and (pointer: fine)').matches ||
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    this.target = {
      x: (event.clientX / window.innerWidth - 0.5) * 2,
      y: (event.clientY / window.innerHeight - 0.5) * 2,
    };
    this.startFrame();
  }

  @HostListener('window:blur')
  protected reset() {
    this.target = { x: 0, y: 0 };
    this.startFrame();
  }

  private startFrame() {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => this.update());
  }

  private update() {
    const ease = 0.09;
    this.position.x += (this.target.x - this.position.x) * ease;
    this.position.y += (this.target.y - this.position.y) * ease;

    const { x, y } = this.position;
    if (this.ambientOne) {
      this.ambientOne.nativeElement.style.translate = `${(x * 46).toFixed(1)}px ${(y * 32).toFixed(1)}px`;
    }
    if (this.ambientTwo) {
      this.ambientTwo.nativeElement.style.translate = `${(-x * 34).toFixed(1)}px ${(-y * 26).toFixed(1)}px`;
    }
    if (this.depthHalo) {
      this.depthHalo.nativeElement.style.transform = `translate3d(${(x * 24).toFixed(1)}px, ${(y * 18).toFixed(1)}px, 0) rotate(${(x * 2).toFixed(2)}deg)`;
    }
    if (this.gridPlane) {
      this.gridPlane.nativeElement.style.transform = `perspective(620px) rotateX(${(58 - y * 1.8).toFixed(2)}deg) rotateZ(${(-8 + x * 1.4).toFixed(2)}deg) translate3d(${(x * 14).toFixed(1)}px, ${(y * 9).toFixed(1)}px, 0)`;
    }
    if (this.prismOne) {
      this.prismOne.nativeElement.style.transform = `translate3d(${(x * 62).toFixed(1)}px, ${(y * 42).toFixed(1)}px, 0) rotate(${(12 + x * 3.5).toFixed(2)}deg)`;
    }
    if (this.prismTwo) {
      this.prismTwo.nativeElement.style.transform = `translate3d(${(-x * 48).toFixed(1)}px, ${(-y * 34).toFixed(1)}px, 0) rotate(${(-18 - x * 3).toFixed(2)}deg)`;
    }

    const unsettled =
      Math.abs(this.target.x - x) > 0.002 ||
      Math.abs(this.target.y - y) > 0.002;
    this.frame = unsettled
      ? requestAnimationFrame(() => this.update())
      : undefined;
  }
}
