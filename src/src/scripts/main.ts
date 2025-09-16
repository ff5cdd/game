// MAIN GAME FILE

// modules to import
import Phaser from 'phaser';                            // Phaser
import { PlayGame } from './playGame';           // playGame scene

// object to initialize the Scale Manager
const scaleObject : Phaser.Types.Core.ScaleConfig = {
    mode        : Phaser.Scale.FIT,                     // adjust size to automatically fit in the window
    autoCenter  : Phaser.Scale.CENTER_BOTH,             // center the game horizontally and vertically
    parent      : 'thegame',                            // DOM id where to render the game
    width       : window.innerWidth,           // game width, in pixels
    height      : window.innerHeight           // game height, in pixels
}

// game configuration object
const configObject : Phaser.Types.Core.GameConfig = { 
    type            : Phaser.AUTO,                     // game renderer
    backgroundColor : 0x000000,  // game background color
    scale           : scaleObject,                      // scale settings
    scene           : [                                 // array with game scenes
        PlayGame                                        // PlayGame scene
    ],
    physics : {                                                                             
        default : 'arcade'                              // physics engine used is arcade physics
    }
}

// the game itself
new Phaser.Game(configObject);