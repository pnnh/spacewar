import Phaser from 'phaser';

export class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    preload(): void {
        this.load.image('ship', 'assets/sprites/player-ship.png');
    }

    create(): void {
        const { width, height } = this.scale;

        // Starfield background
        const starGfx = this.add.graphics();
        const stars: { x: number; y: number; r: number; speed: number }[] = [];
        for (let i = 0; i < 120; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const r = Phaser.Math.FloatBetween(0.5, 2);
            const speed = Phaser.Math.FloatBetween(0.3, 1.5);
            stars.push({ x, y, r, speed });
        }

        // Draw stars on first frame — animated in update via this.events.on
        this.drawStars(starGfx, stars, width, height);

        // Animate starfield
        this.events.on('update', () => {
            stars.forEach(s => {
                s.y += s.speed;
                if (s.y > height) s.y = 0;
            });
            this.drawStars(starGfx, stars, width, height);
        });

        // Decorative ship sprite
        const ship = this.add.image(width / 2, height * 0.48, 'ship');
        ship.setScale(3);
        ship.setAlpha(0.9);

        // Gentle float tween for the ship
        this.tweens.add({
            targets: ship,
            y: ship.y - 12,
            duration: 1800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Engine glow under ship (simple circle)
        const glow = this.add.graphics();
        glow.setDepth(-1);
        glow.fillStyle(0x00ffff, 0.18);
        glow.fillCircle(width / 2, height * 0.48 + 32, 36);

        // Title text
        this.add.text(width / 2, height * 0.15, '太空大战', {
            fontSize: '72px',
            color: '#00ffff',
            fontStyle: 'bold',
            stroke: '#004466',
            strokeThickness: 6,
            shadow: { offsetX: 0, offsetY: 0, color: '#00ffff', blur: 20, fill: true }
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.26, 'SPACE WAR', {
            fontSize: '30px',
            color: '#aaffff',
            letterSpacing: 10,
            stroke: '#002233',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Controls reference
        const controlsY = height * 0.68;
        this.add.text(width / 2, controlsY, '— 操控说明 —', {
            fontSize: '16px',
            color: '#888888'
        }).setOrigin(0.5);

        const controls = [
            '方向键 ↑ ↓ ← →   移动飞船',
            '空格键 SPACE        发射子弹',
            '击杀金色菱形敌人    武器升级',
            '击败 Boss           获得大量积分'
        ];
        controls.forEach((line, i) => {
            this.add.text(width / 2, controlsY + 28 + i * 24, line, {
                fontSize: '15px',
                color: '#cccccc'
            }).setOrigin(0.5);
        });

        // Blinking start prompt
        const startText = this.add.text(width / 2, height * 0.9, '按下 SPACE 或点击鼠标 开始游戏', {
            fontSize: '22px',
            color: '#ffff00',
            stroke: '#443300',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: { from: 1, to: 0.2 },
            duration: 700,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Start game on input
        const startGame = () => this.scene.start('GameScene');
        this.input.once('pointerdown', startGame);
        this.input.keyboard!.once('keydown-SPACE', startGame);
    }

    private drawStars(
        gfx: Phaser.GameObjects.Graphics,
        stars: { x: number; y: number; r: number }[],
        _w: number,
        _h: number
    ): void {
        gfx.clear();
        stars.forEach(s => {
            const alpha = Phaser.Math.Clamp(s.r / 2, 0.3, 1);
            gfx.fillStyle(0xffffff, alpha);
            gfx.fillCircle(s.x, s.y, s.r);
        });
    }
}
