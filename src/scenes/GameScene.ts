import Phaser from 'phaser';

interface GameSprite extends Phaser.Physics.Arcade.Sprite {
    isSpecial?: boolean;
    isAggressive?: boolean;
    isBoss?: boolean;
    health?: number;
    lastFired?: number;
}

export class GameScene extends Phaser.Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private bullets!: Phaser.Physics.Arcade.Group;
    private enemyBullets!: Phaser.Physics.Arcade.Group;
    private enemies!: Phaser.Physics.Arcade.Group;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private fireKey!: Phaser.Input.Keyboard.Key;

    private score: number = 0;
    private nextBossScore: number = 500;
    private bossThresholdIncrement: number = 500;
    private weaponLevel: number = 1;
    private lastFired: number = 0;
    private isGameOver: boolean = false;

    private scoreText!: Phaser.GameObjects.Text;
    private weaponLevelText!: Phaser.GameObjects.Text;

    constructor() {
        super('GameScene');
    }

    preload(): void {
        this.load.image('ship', 'assets/sprites/player-ship.png');
        this.load.image('enemy', 'assets/sprites/enemy-normal.png');
        this.load.image('special_enemy', 'assets/sprites/enemy-special.png');
        this.load.image('boss_enemy', 'assets/sprites/boss.png');
    }

    create(): void {
        const { width, height } = this.scale;

        this.score = 0;
        this.nextBossScore = 500;
        this.bossThresholdIncrement = 500;
        this.weaponLevel = 1;
        this.lastFired = 0;
        this.isGameOver = false;

        // Starfield background
        const starGfx = this.add.graphics().setDepth(-10);
        const stars: { x: number; y: number; r: number; speed: number }[] = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Phaser.Math.Between(0, width),
                y: Phaser.Math.Between(0, height),
                r: Phaser.Math.FloatBetween(0.5, 2),
                speed: Phaser.Math.FloatBetween(0.3, 1.2)
            });
        }
        this.events.on('update', () => {
            stars.forEach(s => { s.y += s.speed; if (s.y > height) s.y = 0; });
            starGfx.clear();
            stars.forEach(s => {
                starGfx.fillStyle(0xffffff, Phaser.Math.Clamp(s.r / 2, 0.3, 1));
                starGfx.fillCircle(s.x, s.y, s.r);
            });
        });

        // Generate bullet textures via Graphics (small, fast — no sprite needed)
        const g = this.add.graphics();
        g.fillStyle(0xffff00, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('bullet', 8, 8);
        g.clear();
        g.fillStyle(0xff4400, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('enemy_bullet', 8, 8);
        g.destroy();

        // Player ship — sprite faces up, no angle rotation needed
        this.player = this.physics.add.sprite(width / 2, height * 0.8, 'ship');
        this.player.setCollideWorldBounds(true);
        this.player.setScale(0.85);

        this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 50 });
        this.enemyBullets = this.physics.add.group({ defaultKey: 'enemy_bullet', maxSize: 100 });
        this.enemies = this.physics.add.group();

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Collisions
        this.physics.add.overlap(this.bullets, this.enemies, (b, e) =>
            this.hitEnemy(b as Phaser.Physics.Arcade.Sprite, e as GameSprite), undefined, this);
        this.physics.add.overlap(this.player, this.enemies, () => this.triggerGameOver(), undefined, this);
        this.physics.add.overlap(this.player, this.enemyBullets, () => this.triggerGameOver(), undefined, this);

        // UI
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '28px', color: '#ffffff' });
        this.weaponLevelText = this.add.text(16, 50, 'Weapon: Lv.1', { fontSize: '18px', color: '#00ff88' });

        // Spawn timer
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }

    update(time: number): void {
        if (this.isGameOver) return;

        const speed = 300;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        } else {
            this.player.setVelocityY(0);
        }

        if (this.fireKey.isDown && time > this.lastFired) {
            this.fireBullet();
            this.lastFired = time + 200;
        }

        // Clean up out-of-bounds objects
        [this.bullets, this.enemyBullets].forEach(group => {
            group.children.each((obj: any) => {
                if (obj.active && (obj.y < -20 || obj.y > this.scale.height + 20 ||
                    obj.x < -20 || obj.x > this.scale.width + 20)) {
                    obj.setActive(false).setVisible(false);
                    obj.body.enable = false;
                }
                return true;
            });
        });

        this.enemies.children.each((obj: any) => {
            const e = obj as GameSprite;
            if (e.active) {
                if (e.y > this.scale.height + 120) {
                    e.destroy();
                } else if (e.isAggressive || e.isBoss) {
                    if (time > (e.lastFired || 0)) {
                        this.enemyFire(e);
                        e.lastFired = time + (e.isBoss ? 800 : 2000);
                    }
                }
            }
            return true;
        });
    }

    private enemyFire(enemy: GameSprite): void {
        const offsetY = enemy.isBoss ? 40 : 20;
        const bullet = this.enemyBullets.get(enemy.x, enemy.y + offsetY) as Phaser.Physics.Arcade.Sprite;
        if (bullet) {
            bullet.setActive(true).setVisible(true);
            bullet.body!.enable = true;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            this.physics.velocityFromRotation(angle, 300, bullet.body!.velocity);
        }
    }

    private fireBullet(): void {
        // Bullets fire straight up (player faces up)
        const upAngle = -Math.PI / 2;
        const speed = 600;

        if (this.weaponLevel === 1) {
            this.createOneBullet(this.player.x, this.player.y - 20, upAngle, speed);
        } else if (this.weaponLevel === 2) {
            this.createOneBullet(this.player.x - 12, this.player.y - 20, upAngle, speed);
            this.createOneBullet(this.player.x + 12, this.player.y - 20, upAngle, speed);
        } else {
            this.createOneBullet(this.player.x, this.player.y - 20, upAngle, speed);
            this.createOneBullet(this.player.x - 14, this.player.y - 10, upAngle - 0.2, speed);
            this.createOneBullet(this.player.x + 14, this.player.y - 10, upAngle + 0.2, speed);
        }
    }

    private createOneBullet(x: number, y: number, angle: number, speed: number): void {
        const bullet = this.bullets.get(x, y) as Phaser.Physics.Arcade.Sprite;
        if (bullet) {
            bullet.setActive(true).setVisible(true);
            bullet.body!.enable = true;
            this.physics.velocityFromRotation(angle, speed, bullet.body!.velocity);
        }
    }

    private spawnEnemy(): void {
        if (this.isGameOver) return;
        const x = Phaser.Math.Between(30, this.scale.width - 30);
        const y = -60;
        const isSpecial = Phaser.Math.Between(1, 100) <= 15;
        const isAggressive = !isSpecial && Phaser.Math.Between(1, 100) <= 20;
        const texture = isSpecial ? 'special_enemy' : 'enemy';

        const enemy = this.enemies.create(x, y, texture) as GameSprite;
        enemy.isSpecial = isSpecial;
        enemy.isAggressive = isAggressive;
        enemy.isBoss = false;
        enemy.setScale(isSpecial ? 0.9 : 0.85);

        // Orange tint for aggressive enemies
        if (isAggressive) enemy.setTint(0xffaa00);

        const speedMin = isSpecial ? 150 : 100;
        const speedMax = isSpecial ? 250 : 200;
        enemy.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(speedMin, speedMax));
    }

    private spawnBoss(): void {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const y = -120;
        const boss = this.enemies.create(x, y, 'boss_enemy') as GameSprite;
        boss.isBoss = true;
        boss.isSpecial = false;
        boss.health = 10;
        boss.setScale(0.85);
        boss.setVelocity(Phaser.Math.Between(-50, 50), 50);

        const bossWarning = this.add.text(this.scale.width / 2, 80, '⚠ BOSS APPROACHING ⚠', {
            fontSize: '36px', color: '#ff00ff', fontStyle: 'bold',
            stroke: '#330033', strokeThickness: 5
        }).setOrigin(0.5);

        this.tweens.add({
            targets: bossWarning,
            alpha: { from: 1, to: 0 },
            duration: 500,
            yoyo: true,
            repeat: 3,
            onComplete: () => bossWarning.destroy()
        });
    }

    private hitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: GameSprite): void {
        bullet.setActive(false).setVisible(false);
        bullet.body!.enable = false;

        if (enemy.isBoss) {
            enemy.health = (enemy.health || 0) - 1;
            enemy.setTint(0xffffff);
            this.time.delayedCall(60, () => { if (enemy.active) enemy.clearTint(); });

            if (enemy.health > 0) return;

            this.cameras.main.shake(500, 0.02);
            this.score += 500;
            const bossText = this.add.text(enemy.x, enemy.y, '🔥 BOSS DESTROYED! +500', {
                fontSize: '22px', color: '#ff88ff', stroke: '#330033', strokeThickness: 4
            }).setOrigin(0.5);
            this.tweens.add({
                targets: bossText,
                y: bossText.y - 100,
                alpha: 0,
                duration: 2000,
                onComplete: () => bossText.destroy()
            });
        } else if (enemy.isSpecial) {
            this.weaponLevel = Math.min(this.weaponLevel + 1, 3);
            this.weaponLevelText.setText(`Weapon: Lv.${this.weaponLevel}`);
            this.weaponLevelText.setColor('#ffff00');
            this.time.delayedCall(800, () => { if (this.weaponLevelText.active) this.weaponLevelText.setColor('#00ff88'); });

            const upgradeTip = this.add.text(enemy.x, enemy.y, `★ WEAPON LV.${this.weaponLevel}!`, {
                fontSize: '20px', color: '#ffff00', stroke: '#333300', strokeThickness: 4
            }).setOrigin(0.5);
            this.tweens.add({
                targets: upgradeTip,
                y: upgradeTip.y - 60,
                alpha: 0,
                duration: 1200,
                onComplete: () => upgradeTip.destroy()
            });
            this.score += 50;
        } else {
            this.score += 10;
        }

        enemy.destroy();
        this.scoreText.setText(`Score: ${this.score}`);

        if (this.score >= this.nextBossScore) {
            this.spawnBoss();
            this.nextBossScore += this.bossThresholdIncrement + 200;
            this.bossThresholdIncrement += 200;
        }
    }

    private triggerGameOver(): void {
        if (this.isGameOver) return;
        this.isGameOver = true;

        this.physics.pause();
        this.player.setTint(0xff4400);

        // Flash then transition to GameOverScene
        this.cameras.main.shake(300, 0.015);
        this.time.delayedCall(600, () => {
            this.scene.start('GameOverScene', { score: this.score });
        });
    }
}
