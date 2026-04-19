import Phaser from 'phaser';

interface GameOverData {
    score: number;
}

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create(data: GameOverData): void {
        const { width, height } = this.scale;
        const score = data?.score ?? 0;

        // Dark semi-transparent overlay
        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.7);
        overlay.fillRect(0, 0, width, height);

        // Starfield background (static)
        const starGfx = this.add.graphics();
        for (let i = 0; i < 80; i++) {
            const alpha = Phaser.Math.FloatBetween(0.2, 0.8);
            starGfx.fillStyle(0xffffff, alpha);
            starGfx.fillCircle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.FloatBetween(0.5, 2)
            );
        }

        // GAME OVER title
        const gameOverText = this.add.text(width / 2, height * 0.3, 'GAME OVER', {
            fontSize: '72px',
            color: '#ff3300',
            fontStyle: 'bold',
            stroke: '#220000',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 0, color: '#ff0000', blur: 24, fill: true }
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: gameOverText,
            alpha: 1,
            scaleX: { from: 0.5, to: 1 },
            scaleY: { from: 0.5, to: 1 },
            duration: 600,
            ease: 'Back.easeOut'
        });

        // Score display
        const scoreText = this.add.text(width / 2, height * 0.48, `最终得分  ${score}`, {
            fontSize: '36px',
            color: '#ffdd00',
            stroke: '#332200',
            strokeThickness: 5
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: scoreText,
            alpha: 1,
            duration: 500,
            delay: 400
        });

        // Grade message
        let grade = '';
        if (score >= 2000) grade = '🏆 传奇飞行员！';
        else if (score >= 1000) grade = '⭐ 精英飞行员！';
        else if (score >= 500) grade = '✈ 优秀飞行员！';
        else grade = '🚀 继续努力！';

        const gradeText = this.add.text(width / 2, height * 0.58, grade, {
            fontSize: '24px',
            color: '#aaffcc',
            stroke: '#002211',
            strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: gradeText,
            alpha: 1,
            duration: 500,
            delay: 700
        });

        // Blinking restart prompt
        const restartText = this.add.text(width / 2, height * 0.76, '按下 SPACE 或点击鼠标 重新开始', {
            fontSize: '20px',
            color: '#ffff88',
            stroke: '#333300',
            strokeThickness: 3
        }).setOrigin(0.5).setAlpha(0);

        this.tweens.add({
            targets: restartText,
            alpha: 1,
            duration: 400,
            delay: 1000,
            onComplete: () => {
                this.tweens.add({
                    targets: restartText,
                    alpha: { from: 1, to: 0.2 },
                    duration: 700,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        // Return to start screen hint
        this.add.text(width / 2, height * 0.85, '(将返回主菜单)', {
            fontSize: '14px',
            color: '#666666'
        }).setOrigin(0.5).setAlpha(0.6);

        // Input — go back to StartScene after short delay to avoid accidental input
        this.time.delayedCall(1000, () => {
            const goToStart = () => this.scene.start('StartScene');
            this.input.once('pointerdown', goToStart);
            this.input.keyboard!.once('keydown-SPACE', goToStart);
        });
    }
}
