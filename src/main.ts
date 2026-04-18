import Phaser from 'phaser';

// 定义自定义属性接口
interface GameSprite extends Phaser.Physics.Arcade.Sprite {
    isSpecial?: boolean;
    isAggressive?: boolean;
    isBoss?: boolean;
    health?: number;
    lastFired?: number;
}

class GameScene extends Phaser.Scene {
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

    private scoreText!: Phaser.GameObjects.Text;
    private weaponLevelText!: Phaser.GameObjects.Text;

    constructor() {
        super('GameScene');
    }

    preload(): void {
        // 使用 Graphics 绘制贴图
    }

    create(): void {
        const { width, height } = this.scale;

        // 1. 绘制飞船
        const graphics = this.add.graphics();
        graphics.lineStyle(2, 0x00ff00, 1);
        graphics.fillStyle(0x00ff00, 0.3);
        graphics.beginPath();
        graphics.moveTo(35, 20);
        graphics.lineTo(10, 32);
        graphics.lineTo(15, 20);
        graphics.lineTo(10, 8);
        graphics.closePath();
        graphics.strokePath();
        graphics.fillPath();
        graphics.fillStyle(0x00ffff, 0.8);
        graphics.fillCircle(20, 20, 4);
        graphics.lineStyle(1, 0x00ffff, 1);
        graphics.lineBetween(15, 20, 35, 20);
        graphics.generateTexture('ship', 40, 40);
        graphics.clear();

        // 2. 绘制子弹
        graphics.fillStyle(0xffff00, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('bullet', 8, 8);
        graphics.clear();

        // 2.5 绘制敌方子弹
        graphics.fillStyle(0xff0000, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('enemy_bullet', 8, 8);
        graphics.clear();

        // 3. 绘制敌人
        graphics.lineStyle(2, 0xff0000, 1);
        graphics.strokeCircle(15, 15, 15);
        graphics.generateTexture('enemy', 30, 30);
        graphics.clear();

        // 绘制特殊敌人
        graphics.lineStyle(2, 0xffff00, 1);
        graphics.fillStyle(0xffff00, 0.5);
        graphics.beginPath();
        graphics.moveTo(15, 0);
        graphics.lineTo(30, 15);
        graphics.lineTo(15, 30);
        graphics.lineTo(0, 15);
        graphics.closePath();
        graphics.strokePath();
        graphics.fillPath();
        graphics.generateTexture('special_enemy', 30, 30);
        graphics.clear();

        // 绘制 Boss
        graphics.lineStyle(3, 0xff00ff, 1);
        graphics.fillStyle(0x660066, 0.8);
        graphics.beginPath();
        graphics.moveTo(30, 0);
        graphics.lineTo(60, 20);
        graphics.lineTo(60, 40);
        graphics.lineTo(30, 60);
        graphics.lineTo(0, 40);
        graphics.lineTo(0, 20);
        graphics.closePath();
        graphics.strokePath();
        graphics.fillPath();
        graphics.lineStyle(2, 0xffffff, 1);
        graphics.strokeCircle(30, 30, 10);
        graphics.generateTexture('boss_enemy', 60, 60);
        graphics.destroy();

        // 初始化对象
        this.player = this.physics.add.sprite(width / 2, height * 0.7, 'ship');
        this.player.setAngle(-90);
        this.player.setCollideWorldBounds(true);

        this.bullets = this.physics.add.group({ defaultKey: 'bullet', maxSize: 50 });
        this.enemyBullets = this.physics.add.group({ defaultKey: 'enemy_bullet', maxSize: 100 });
        this.enemies = this.physics.add.group();

        this.cursors = this.input.keyboard!.createCursorKeys();
        this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // 碰撞检测
        this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as Phaser.Physics.Arcade.Sprite, e as GameSprite), undefined, this);
        this.physics.add.overlap(this.player, this.enemies, () => this.gameOver(), undefined, this);
        this.physics.add.overlap(this.player, this.enemyBullets, () => this.gameOver(), undefined, this);

        // UI
        this.scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', color: '#fff' });
        this.weaponLevelText = this.add.text(16, 50, 'Weapon: Lv.1', { fontSize: '20px', color: '#0f0' });

        // 定时生成敌人
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });
    }

    update(time: number): void {
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

        // 清理越界对象
        this.bullets.children.each((bullet: any) => {
            if (bullet.active && (bullet.y < 0 || bullet.y > this.scale.height || bullet.x < 0 || bullet.x > this.scale.width)) {
                bullet.setActive(false).setVisible(false);
                bullet.body.enable = false;
            }
            return true;
        });

        this.enemyBullets.children.each((bullet: any) => {
            if (bullet.active && (bullet.y < 0 || bullet.y > this.scale.height || bullet.x < 0 || bullet.x > this.scale.width)) {
                bullet.setActive(false).setVisible(false);
                bullet.body.enable = false;
            }
            return true;
        });

        this.enemies.children.each((enemy: any) => {
            const e = enemy as GameSprite;
            if (e.active) {
                if (e.y > this.scale.height + 100) {
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
        const bullet = this.enemyBullets.get(enemy.x, enemy.y + (enemy.isBoss ? 30 : 15)) as Phaser.Physics.Arcade.Sprite;
        if (bullet) {
            bullet.setActive(true).setVisible(true);
            bullet.body!.enable = true;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            this.physics.velocityFromRotation(angle, 300, bullet.body!.velocity);
        }
    }

    private fireBullet(): void {
        const angle = this.player.rotation;
        const speed = 500;

        if (this.weaponLevel === 1) {
            this.createOneBullet(this.player.x, this.player.y, angle, speed);
        } else if (this.weaponLevel === 2) {
            const offset = 10;
            const x1 = this.player.x + Math.cos(angle + Math.PI / 2) * offset;
            const y1 = this.player.y + Math.sin(angle + Math.PI / 2) * offset;
            const x2 = this.player.x + Math.cos(angle - Math.PI / 2) * offset;
            const y2 = this.player.y + Math.sin(angle - Math.PI / 2) * offset;
            this.createOneBullet(x1, y1, angle, speed);
            this.createOneBullet(x2, y2, angle, speed);
        } else {
            this.createOneBullet(this.player.x, this.player.y, angle, speed);
            this.createOneBullet(this.player.x, this.player.y, angle - 0.2, speed);
            this.createOneBullet(this.player.x, this.player.y, angle + 0.2, speed);
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
        const x = Phaser.Math.Between(0, this.scale.width);
        const y = -50;
        const isSpecial = Phaser.Math.Between(1, 100) <= 15;
        const isAggressive = !isSpecial && Phaser.Math.Between(1, 100) <= 20;
        const texture = isSpecial ? 'special_enemy' : 'enemy';
        
        const enemy = this.enemies.create(x, y, texture) as GameSprite;
        enemy.isSpecial = isSpecial;
        enemy.isAggressive = isAggressive;
        enemy.isBoss = false;
        
        if (isAggressive) enemy.setTint(0xffaa00);
        
        const speedMin = isSpecial ? 150 : 100;
        const speedMax = isSpecial ? 250 : 200;
        enemy.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(speedMin, speedMax));
    }

    private spawnBoss(): void {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const y = -100;
        const boss = this.enemies.create(x, y, 'boss_enemy') as GameSprite;
        boss.isBoss = true;
        boss.isSpecial = false;
        boss.health = 10;
        boss.setVelocity(Phaser.Math.Between(-50, 50), 50);
        
        const bossWarning = this.add.text(this.scale.width / 2, 100, 'BOSS APPROACHING!', { 
            fontSize: '40px', color: '#f0f', fontStyle: 'bold' 
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
            this.time.delayedCall(50, () => enemy.clearTint());
            
            if (enemy.health > 0) return;
            
            this.cameras.main.shake(500, 0.02);
            this.score += 500;
            const bossText = this.add.text(enemy.x, enemy.y, 'BOSS DESTROYED! +500', { 
                fontSize: '24px', color: '#f0f' 
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
            this.weaponLevelText.setTint(0x00ff00);
            const upgradeTip = this.add.text(enemy.x, enemy.y, 'WEAPON UPGRADE!', { 
                fontSize: '20px', color: '#ff0' 
            }).setOrigin(0.5);
            this.tweens.add({
                targets: upgradeTip,
                y: upgradeTip.y - 50,
                alpha: 0,
                duration: 1000,
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

    private gameOver(): void {
        this.physics.pause();
        this.player.setTint(0xff0000);
        
        const { width, height } = this.scale;
        
        this.add.text(width / 2, height / 2 - 20, 'GAME OVER', { 
            fontSize: '64px', color: '#f00', fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 50, 'Press SPACE or Click to Restart', { 
            fontSize: '24px', color: '#fff' 
        }).setOrigin(0.5);
        
        const restart = () => {
            this.scene.restart();
            this.score = 0;
            this.nextBossScore = 500;
            this.bossThresholdIncrement = 500;
            this.weaponLevel = 1;
        };

        // 监听鼠标点击
        this.input.once('pointerdown', restart);
        
        // 监听空格键
        this.input.keyboard!.once('keydown-SPACE', restart);
    }
}

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0, x: 0 }, debug: false }
    },
    scene: GameScene
};

new Phaser.Game(config);
