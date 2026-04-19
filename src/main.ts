import Phaser from 'phaser';
import { StartScene } from './scenes/StartScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0, x: 0 }, debug: false }
    },
    scene: [StartScene, GameScene, GameOverScene]
};

new Phaser.Game(config);
