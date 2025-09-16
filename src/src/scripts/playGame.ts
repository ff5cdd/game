import Phaser from 'phaser';

interface Config {
  texture: string;
  health: number;
  speed: number;
  bulletSpeed?: number;
  bulletRate?: number;
  spawnRate?: number;
  maxCount?: number;
  scale: number;
}

interface StageConfig {
  name: string;
  players: Config[];
  enemies: {
    regular: Config;
    bossDog: Config;
    bossTank: Config;
    bossWeini: Config;
  };
}

export class PlayGame extends Phaser.Scene {
  private version = '0.0.6';
  private name = '$LI猫 大作战';
  private spacing = 28;
  private stageConfigs: StageConfig[] = [
    {
      name: 'Initial Stage',
      players: [{ texture: 'player', health: 1, speed: 200, bulletSpeed: 400, bulletRate: 500, scale: 0.8 }],
      enemies: {
        regular: { texture: 'enemy', health: 1, speed: 100, spawnRate: 1000, maxCount: 100, scale: 0.6 },
        bossDog: { texture: 'bossDog', health: 6, speed: 100, spawnRate: 100000, maxCount: 0, scale: 0.5 },
        bossTank: { texture: 'bossTank', health: 12, speed: 100, spawnRate: 100000, maxCount: 0, scale: 0.5 },
        bossWeini: { texture: 'bossWeini', health: 66, speed: 100, spawnRate: 100000, maxCount: 0, scale: 0.5 },
      },
    },
    {
      name: 'BossDog Stage',
      players: [
        { texture: 'player', health: 1, speed: 300, bulletSpeed: 380, bulletRate: 500, scale: 0.45 },
        { texture: 'playerDor', health: 1, speed: 300, bulletSpeed: 380, bulletRate: 500, scale: 0.45 },
      ],
      enemies: {
        regular: { texture: 'enemy', health: 1, speed: 100, spawnRate: 500, maxCount: 200, scale: 0.34 },
        bossDog: { texture: 'bossDog', health: 6, speed: 100, spawnRate: 2000, maxCount: 25, scale: 0.30 },
        bossTank: { texture: 'bossTank', health: 12, speed: 100, spawnRate: 100000, maxCount: 0, scale: 0.28 },
        bossWeini: { texture: 'bossWeini', health: 66, speed: 100, spawnRate: 100000, maxCount: 0, scale: 0.5 },
      },
    },
    {
      name: 'BossTank Stage',
      players: [
        { texture: 'player', health: 1, speed: 300, bulletSpeed: 360, bulletRate: 500, scale: 0.42 },
        { texture: 'playerDor', health: 1, speed: 300, bulletSpeed: 360, bulletRate: 500, scale: 0.42 },
        { texture: 'playerXu', health: 1, speed: 300, bulletSpeed: 360, bulletRate: 500, scale: 0.42 },
      ],
      enemies: {
        regular: { texture: 'enemy', health: 1, speed: 100, spawnRate: 250, maxCount: 300, scale: 0.30 },
        bossDog: { texture: 'bossDog', health: 6, speed: 100, spawnRate: 1500, maxCount: 30, scale: 0.28 },
        bossTank: { texture: 'bossTank', health: 12, speed: 100, spawnRate: 4000, maxCount: 15, scale: 0.22 },
        bossWeini: { texture: 'bossWeini', health: 66, speed: 100, spawnRate: 100000, maxCount: 1, scale: 0.6 },
      },
    },
    {
      name: 'BossWeini Stage',
      players: [
        { texture: 'player', health: 1, speed: 300, bulletSpeed: 340, bulletRate: 500, scale: 0.40 },
        { texture: 'playerDor', health: 1, speed: 300, bulletSpeed: 340, bulletRate: 500, scale: 0.40 },
        { texture: 'playerXu', health: 1, speed: 300, bulletSpeed: 340, bulletRate: 500, scale: 0.40 },
      ],
      enemies: {
        regular: { texture: 'enemy', health: 1, speed: 100, spawnRate: 100, maxCount: 300, scale: 0.28 },
        bossDog: { texture: 'bossDog', health: 6, speed: 100, spawnRate: 1125, maxCount: 36, scale: 0.26 },
        bossTank: { texture: 'bossTank', health: 12, speed: 100, spawnRate: 3000, maxCount: 20, scale: 0.20 },
        bossWeini: { texture: 'bossWeini', health: 66, speed: 100, spawnRate: 100000, maxCount: 1, scale: 0.4 },
      },
    },
  ];

  private stageIndex = 0;
  private killCounts: Record<'enemy' | 'bossDog' | 'bossTank' | 'bossWeini', number> = { enemy: 0, bossDog: 0, bossTank: 0, bossWeini: 0 };
  private bossThresholds = { enemyKillsForDog: 30, dogKillsForTank: 20, tankKillsForFinal: 15 };
  private players: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody[] = [];
  private groups: Record<'enemy' | 'bossDog' | 'bossTank' | 'finalBoss' | 'bullet', Phaser.Physics.Arcade.Group | null> = {
    enemy: null,
    bossDog: null,
    bossTank: null,
    finalBoss: null,
    bullet: null,
  };
  private timers: Record<string, Phaser.Time.TimerEvent | null> = {};
  private ui: { texts: Record<string, Phaser.GameObjects.Text>; graphics: Record<string, Phaser.GameObjects.Graphics | Phaser.GameObjects.Image> } = { texts: {}, graphics: {} };
  private sounds: Record<string, Phaser.Sound.BaseSound> = {};
  private touch = { start: null as Phaser.Math.Vector2 | null, move: new Phaser.Math.Vector2(0, 0) };
  private playerCenter = new Phaser.Math.Vector2();
  private score = 0;
  private elapsedTime = 0;
  private isMuted = false;
  private isGameStarted = false;
  private isGamePaused = false;
  private bg!: Phaser.GameObjects.Image;
  private scales = { initial: 0, final: 0, step: 0, player: 0.6, enemy: 0.6, bullet: 0.4 };
  private spawnAreas = { outer: null as Phaser.Geom.Rectangle | null, inner: null as Phaser.Geom.Rectangle | null };
  private controlKeys!: Record<string, Phaser.Input.Keyboard.Key>;
  private isSpawningBoss = false;

  constructor() {
    super({ key: 'PlayGame' });
  }

  preload(): void {
    const assets = [
      { key: 'enemy', path: 'assets/sprites/qu.png' },
      { key: 'player', path: 'assets/sprites/li.png' },
      { key: 'playerDor', path: 'assets/sprites/dor.png' },
      { key: 'playerXu', path: 'assets/sprites/shiba.png' },
      { key: 'bullet', path: 'assets/sprites/bi.png' },
      { key: 'bossDog', path: 'assets/sprites/dog.png' },
      { key: 'bossTank', path: 'assets/sprites/tank.png' },
      { key: 'bossWeini', path: 'assets/sprites/winnie.png' },
      { key: 'bg', path: 'assets/sprites/bg.png' },
      { key: 'coin', path: 'assets/sprites/coin.mp3', type: 'audio' },
      { key: 'laser', path: 'assets/sprites/laser.mp3', type: 'audio' },
      { key: 'bgm', path: 'assets/sprites/bg.mp3', type: 'audio' },
      { key: 'cat', path: 'assets/sprites/cat.mp3', type: 'audio' },
    ];
    assets.forEach(({ key, path, type }) => type === 'audio' ? this.load.audio(key, path) : this.load.image(key, path));
  }

  private getGameSize() {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  private initOnce(): void {
    this.sounds = {
      coin: this.sound.add('coin', { volume: 0.3 }),
      laser: this.sound.add('laser', { volume: 0.4 }),
      bgm: this.sound.add('bgm', { loop: true, volume: 0.2 }),
      cat: this.sound.add('cat', { volume: 1 }),
    };
  }

  private updateScales(): void {
    const { width, height } = this.getGameSize();
    const bgTexture = this.textures.get('bg').getSourceImage();
    this.scales.final = Math.max(width / bgTexture.width, height / bgTexture.height);
    this.scales.initial = this.scales.final * (width < 600 ? 0.8 : 1.2);
    this.bg?.setScale(this.scales.initial);
    this.updateBodyToMatchScale(this.bg);
  }

  private updateBodyToMatchScale(sprite: Phaser.GameObjects.GameObject | undefined): void {
    if (!sprite || !('body' in sprite) || !sprite.body || !('setSize' in sprite.body)) return;
    const { width, height } = (sprite as Phaser.GameObjects.Sprite).texture.get();
    sprite.body.setSize(width * (sprite as Phaser.GameObjects.Sprite).scaleX * 1.2, height * (sprite as Phaser.GameObjects.Sprite).scaleY * 1.2, true);
  }

  private resetForRestart(): void {
    const { width, height } = this.getGameSize();
    this.stageIndex = 0;
    this.killCounts = { enemy: 0, bossDog: 0, bossTank: 0, bossWeini: 0 };
    this.score = 0;
    this.elapsedTime = 0;
    this.isGameStarted = false;
    this.isGamePaused = false;
    this.scales.step = 0;
    this.touch = { start: null, move: new Phaser.Math.Vector2(0, 0) };
    this.isSpawningBoss = false;

    this.bg?.destroy();
    this.bg = this.add.image(width / 2, height / 2, 'bg').setOrigin(0.5);
    this.updateScales();

    this.spawnAreas.outer = new Phaser.Geom.Rectangle(-100, -100, width + 200, height + 200);
    this.spawnAreas.inner = new Phaser.Geom.Rectangle(50, 50, width - 100, height - 100);

    Object.values(this.ui.texts).forEach(text => text?.destroy());
    Object.values(this.ui.graphics).forEach(gfx => gfx?.destroy());
    this.ui.texts = {};
    this.ui.graphics = {};

    this.setupControlButton('muteButton', 20, 20, '🔇 静音', '#888888', '#555555', 0x666666, () => this.toggleMute(), 100, 48, false);
    this.setupControlButton('pauseButton', 20, 80, '⏸️ 暂停', '#888888', '#555555', 0x666666, () => this.togglePause(), 100, 48, false);
    this.setupControlButton('resetButton', 20, 140, '🔄 重置', '#888888', '#555555', 0x666666, () => this.resetGame(), 100, 48, false);
    ['muteButton', 'pauseButton', 'resetButton'].forEach(key => {
      this.ui.texts[key]?.setVisible(false);
      this.ui.graphics[`${key}Bg`]?.setVisible(false);
    });

    this.setupButton('startButton', width / 2, height / 2, '▶   作战开始', '#ffccccff', '#800000ff', 0xff1e1e, () => this.startGame(), 140, 60, true);
    this.ui.texts.titleText = this.add.text(width / 2, (this.ui.texts.startButton?.y || height / 2) - 80, this.name, {
      fontSize: '48px', color: '#ffffff', fontFamily: 'Arial', stroke: '#800000ff', strokeThickness: 8, shadow: { offsetX: 4, offsetY: 4, blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(5);

    Object.values(this.groups).forEach(group => group?.destroy(true));
    this.groups = {
      enemy: this.physics.add.group({ maxSize: this.stageConfigs[0].enemies.regular.maxCount }).setDepth(1),
      bossDog: this.physics.add.group({ maxSize: this.stageConfigs[0].enemies.bossDog.maxCount }).setDepth(1),
      bossTank: this.physics.add.group({ maxSize: this.stageConfigs[0].enemies.bossTank.maxCount }).setDepth(1),
      finalBoss: this.physics.add.group({ maxSize: 10 }).setDepth(1),
      bullet: this.physics.add.group({ maxSize: 100 }).setDepth(1),
    };

    for (let i = 0; i < 5; i++) {
      const boss = this.groups.finalBoss!.create(0, 0, 'bossDog') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      boss.setActive(false).setVisible(false).body.checkCollision.none = true;
    }

    Object.values(this.timers).forEach(timer => timer?.remove());
    this.setupTimers();

    this.players.forEach(p => p.destroy());
    this.players = [];
    this.playerCenter.set(width / 2, height / 2);

    const player = this.physics.add.sprite(this.playerCenter.x, this.playerCenter.y, this.stageConfigs[0].players[0].texture).setDepth(0);
    player.setData('health', this.stageConfigs[0].players[0].health).setScale(this.stageConfigs[0].players[0].scale);
    this.updateBodyToMatchScale(player);
    this.players.push(player);

    this.controlKeys = this.input.keyboard!.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' }) as any;
    this.input.off('pointerdown').off('pointermove').off('pointerup');
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.touch.start = new Phaser.Math.Vector2(p.x, p.y));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.touch.start) this.touch.start.set(p.x, p.y); });
    this.input.on('pointerup', () => this.touch.start = null);

    this.sound.stopAll();
    this.add.text(width - 20, height - 40, `Version: ${this.version}`, {
      fontSize: '12px', color: '#5f5f5fff', align: 'right', padding: { x: 12, y: 8 }, fontFamily: 'Arial'
    }).setOrigin(1, 0).setDepth(4);

    const textStyle = { fontSize: '24px', color: '#ffcccc', align: 'right', padding: { x: 12, y: 8 }, fontFamily: 'Arial', stroke: '#800000', strokeThickness: 4 };
    this.ui.texts.scoreText = this.add.text(width - 20, 10, '积分: 0', textStyle).setOrigin(1, 0).setDepth(4).setVisible(false);
    this.ui.texts.timerText = this.add.text(width - 20, 50, '时长: 0s', textStyle).setOrigin(1, 0).setDepth(4).setVisible(false);
    this.ui.texts.finalBossKillText = this.add.text(width - 20, 90, '大BOSS 击杀: 0', textStyle).setOrigin(1, 0).setDepth(4).setVisible(false);

    const iconSize = 32, startY = 130, lineSpacing = 30, killTextStyle = { fontSize: '20px', color: '#ffdd99', align: 'right', padding: { x: 8, y: 4 }, fontFamily: 'Arial', stroke: '#800000', strokeThickness: 3 };
    (['enemy', 'bossDog', 'bossTank', 'bossWeini'] as const).forEach((key, i) => {
      this.ui.graphics[`${key}Icon`] = this.add.image(width - iconSize - 50 - 8, startY + lineSpacing * i + iconSize / 2, key)
        .setOrigin(1, 0.5)
        .setDisplaySize(iconSize, iconSize)
        .setDepth(4)
        .setVisible(false);
      this.ui.texts[key] = this.add.text(width - 40, startY + lineSpacing * i, '0', killTextStyle)
        .setOrigin(1, 0)
        .setDepth(4)
        .setVisible(false);
    });
  }

  create(): void {
    if (!['bg', 'player', 'playerDor', 'playerXu', 'enemy', 'bossDog', 'bossTank', 'bossWeini', 'bullet'].every(t => this.textures.exists(t))) {
      this.textures.once(Phaser.Textures.Events.ADD, () => this.scene.restart());
      return;
    }
    this.physics.world.setFPS(120);
    this.initOnce();
    this.resetForRestart();
    this.setupCollisions();
  }

  private setupControlButton(key: string, x: number, y: number, text: string, color: string, stroke: string, fill: number, callback: () => void, width: number, height: number, enabled: boolean): void {
    this.ui.texts[key]?.destroy();
    this.ui.texts[key] = this.add.text(x, y, text, { fontSize: '28px', color, padding: { x: 16, y: 10 }, stroke, fontFamily: 'Arial', strokeThickness: 6 })
      .setOrigin(0).setDepth(10).setAlpha(enabled ? 1 : 0.6);
    if (enabled) this.ui.texts[key].setInteractive({ useHandCursor: true }).on('pointerdown', callback);

    const bgKey = `${key}Bg`;
    this.ui.graphics[bgKey]?.destroy();
    this.ui.graphics[bgKey] = this.add.graphics().fillStyle(fill).lineStyle(2, enabled ? 0xffffff : 0x888888)
      .fillRoundedRect(x, y, width, height, 8).strokeRoundedRect(x, y, width, height, 8).setDepth(9).setAlpha(enabled ? 1 : 0.6);
    if (enabled) this.ui.graphics[bgKey].setInteractive(new Phaser.Geom.Rectangle(x, y, width, height), Phaser.Geom.Rectangle.Contains).on('pointerdown', callback);
  }

  private setupButton(key: string, x: number, y: number, text: string, color: string, stroke: string, fill: number, callback: () => void, width: number, height: number, center = false): void {
    const fontSize = center ? 36 : 28, paddingX = center ? 24 : 16, paddingY = center ? 12 : 10;
    this.ui.texts[key]?.destroy();
    this.ui.texts[key] = this.add.text(center ? x : x, center ? y : y, text, {
      fontSize: `${fontSize}px`, color, padding: { x: paddingX, y: paddingY }, stroke, fontFamily: 'Arial', strokeThickness: 6, shadow: { offsetX: 4, offsetY: 4, blur: 8, stroke: true, fill: true }
    }).setOrigin(center ? 0.5 : 0).setInteractive({ useHandCursor: true }).setDepth(10).on('pointerdown', callback);

    const bgKey = `${key}Bg`, bgX = center ? x - width / 2 : x, bgY = center ? y - height / 2 : y;
    this.ui.graphics[bgKey]?.destroy();
    this.ui.graphics[bgKey] = this.add.graphics().fillStyle(fill).lineStyle(2, 0xffffff)
      .fillRoundedRect(bgX, bgY, width, height, 8).strokeRoundedRect(bgX, bgY, width, height, 8)
      .setInteractive(new Phaser.Geom.Rectangle(bgX, bgY, width, height), Phaser.Geom.Rectangle.Contains).setDepth(9).on('pointerdown', callback);
  }

  private setupTimers(): void {
    const config = this.stageConfigs[this.stageIndex];
    this.timers = {
      game: this.time.addEvent({ delay: 1000, loop: true, paused: true, callback: () => {
        this.elapsedTime++;
        this.ui.texts.timerText.setText(`时长: ${this.elapsedTime} 秒`);
      }}),
      regularEnemy: this.time.addEvent({ delay: config.enemies.regular.spawnRate, loop: true, paused: true, callback: () => this.spawnEnemy('regular') }),
      bossDog: this.time.addEvent({ delay: config.enemies.bossDog.spawnRate, loop: true, paused: true, callback: () => this.spawnEnemy('bossDog') }),
      bossTank: this.time.addEvent({ delay: config.enemies.bossTank.spawnRate, loop: true, paused: true, callback: () => this.spawnEnemy('bossTank') }),
      bossCheck: this.time.addEvent({ delay: 500, loop: true, paused: true, callback: () => this.checkAndSpawnBoss() }),
      bullet: this.time.addEvent({ delay: config.players[0].bulletRate, loop: true, paused: true, callback: () => this.fireBullet() }),
    };
  }

  private setupCollisions(): void {
    const handleHit = (bullet: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, entity: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, group: Phaser.Physics.Arcade.Group, counter?: keyof typeof this.killCounts) => {
      bullet.setActive(false).setVisible(false).body.checkCollision.none = true;
      const health = entity.getData('health') - 1;
      entity.setData('health', health);
      if (health <= 0) {
        entity.setActive(false).setVisible(false).body.checkCollision.none = true;
        if (counter) this.killCounts[counter]++;
        if (group === this.groups.finalBoss) this.handleBossDefeat(entity);
        this.updateKillCountDisplay();
      }
      this.score++;
      this.ui.texts.scoreText.setText(`积分: ${this.score}`);
      if (!this.isMuted) this.sounds.coin?.play();
    };

    (['enemy', 'bossDog', 'bossTank', 'finalBoss'] as const).forEach((key, i) => {
      this.physics.add.collider(this.groups.bullet!, this.groups[key]!, (b, e) => handleHit(
        b as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
        e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
        this.groups[key]!,
        ['enemy', 'bossDog', 'bossTank', undefined][i] as keyof typeof this.killCounts | undefined
      ));
      this.physics.add.collider(this.players, this.groups[key]!, (p, e) => this.handlePlayerCollision(p as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody));
    });
  }

  private updateKillCountDisplay(): void {
    if (!this.isGameStarted) return;
    (['enemy', 'bossDog', 'bossTank', 'bossWeini'] as const).forEach(key => {
      if (this.killCounts[key] > 0) {
        this.ui.graphics[`${key}Icon`]?.setVisible(true);
        this.ui.texts[key]?.setVisible(true).setText(`x ${this.killCounts[key]}`);
      }
    });
  }

  private checkAndSpawnBoss(): void {
    if (this.isSpawningBoss || this.groups.finalBoss!.countActive(true) > 0) return;
    let bossKey: 'bossDog' | 'bossTank' | 'bossWeini' | '' = '';
    if (this.stageIndex === 0 && this.killCounts.enemy >= this.bossThresholds.enemyKillsForDog) bossKey = 'bossDog';
    else if (this.stageIndex === 1 && this.killCounts.bossDog >= this.bossThresholds.dogKillsForTank) bossKey = 'bossTank';
    else if (this.stageIndex >= 2 && this.killCounts.bossTank >= this.bossThresholds.tankKillsForFinal) bossKey = 'bossWeini';
    if (bossKey) {
      this.isSpawningBoss = true;
      const spawnPoint = new Phaser.Geom.Point();
      Phaser.Geom.Rectangle.RandomOutside(this.spawnAreas.outer!, this.spawnAreas.inner!, spawnPoint);
      this.spawnBoss(spawnPoint, bossKey);
      this.time.delayedCall(500, () => this.isSpawningBoss = false);
    }
  }

  private spawnEnemy(type: 'regular' | 'bossDog' | 'bossTank'): void {
    const config = this.stageConfigs[this.stageIndex].enemies[type];
    const group = this.groups[type === 'regular' ? 'enemy' : type === 'bossDog' ? 'bossDog' : 'bossTank']!;
    if (group.countActive(true) >= config.maxCount!) return;
    const spawnPoint = new Phaser.Geom.Point();
    Phaser.Geom.Rectangle.RandomOutside(this.spawnAreas.outer!, this.spawnAreas.inner!, spawnPoint);
    const enemy = group.get(spawnPoint.x, spawnPoint.y, config.texture) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    if (enemy) {
      enemy.setActive(true).setVisible(true).body.checkCollision.none = false;
      enemy.setFlipX(spawnPoint.x > this.players[0].x).setScale(config.scale * this.bg.scale / this.scales.initial);
      this.updateBodyToMatchScale(enemy);
      enemy.setDataEnabled().setData('health', config.health);
    }
  }

  private spawnBoss(spawnPoint: Phaser.Geom.Point, bossKey: 'bossDog' | 'bossTank' | 'bossWeini'): void {
    const config = this.stageConfigs[this.stageIndex].enemies[bossKey];
    let boss = this.groups.finalBoss!.get(spawnPoint.x, spawnPoint.y, config.texture) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    if (!boss) {
      boss = this.physics.add.sprite(spawnPoint.x, spawnPoint.y, config.texture).setDepth(1) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
      this.groups.finalBoss!.add(boss);
    }
    if (boss && !boss.active) {
      boss.setTexture(config.texture).setFlipX(spawnPoint.x > this.players[0].x).setScale(config.scale * this.bg.scale / this.scales.initial);
      this.updateBodyToMatchScale(boss);
      boss.setData('health', config.health).setData('bossKey', bossKey).setActive(true).setVisible(true).body.checkCollision.none = false;
      if (bossKey === 'bossWeini') this.ui.texts.finalBossKillText?.setVisible(true);
      this.isSpawningBoss = false;
    }
  }

  private fireBullet(): void {
    this.players.forEach((player, index) => {
      const targets = [
        ...this.groups.enemy!.getMatching('active', true),
        ...this.groups.bossDog!.getMatching('active', true),
        ...this.groups.bossTank!.getMatching('active', true),
        ...this.groups.finalBoss!.getMatching('active', true),
      ];
      const target = targets.length > 0 ? this.physics.closest(player, targets) : null;
      if (target) {
        const bullet = this.groups.bullet!.get(player.x, player.y, 'bullet') as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
        if (bullet) {
          bullet.setActive(true).setVisible(true);
          bullet.body.checkCollision.none = false;
          const scaleRatio = this.bg.scale / this.scales.initial;
          bullet.setScale(this.scales.bullet * scaleRatio * 1.5); // Increase scale for larger hitbox
          this.updateBodyToMatchScale(bullet);
          this.physics.moveToObject(bullet, target, this.stageConfigs[this.stageIndex].players[index].bulletSpeed);
          if (!this.isMuted) this.sounds.laser?.play();
        }
      }
    });
  }

  private handleBossDefeat(boss: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    const bossKey = boss.getData('bossKey') as 'bossDog' | 'bossTank' | 'bossWeini';
    boss.setActive(false).setVisible(false).body.checkCollision.none = true;
    this.groups.finalBoss!.remove(boss);

    if (bossKey === 'bossDog') {
      this.stageIndex = 1;
      this.addPlayer('playerDor', 'right');
    } else if (bossKey === 'bossTank') {
      this.stageIndex = 2;
      this.addPlayer('playerXu', 'left');
    } else if (bossKey === 'bossWeini') {
      this.killCounts.bossWeini++;
      this.ui.texts.finalBossKillText?.setText(`大BOSS 击杀: ${this.killCounts.bossWeini}`).setVisible(true);
      this.bossThresholds.tankKillsForFinal += this.bossThresholds.tankKillsForFinal;
      this.stageIndex = 3;
    }

    Object.values(this.groups).slice(0, 3).forEach(g => g?.clear(true, true));
    this.updateTimers();

    if (this.scales.step < 3 && this.stageIndex < 3) {
      this.scales.step++;
      const targetBgScale = this.scales.initial - (this.scales.initial - this.scales.initial * 0.3) * (this.scales.step / 3);
      const scaleRatio = targetBgScale / this.scales.initial;
      this.tweens.add({ targets: this.bg, scale: targetBgScale, duration: 1000, ease: 'Sine.easeInOut', onUpdate: () => this.updateBodyToMatchScale(this.bg) });
      this.players.forEach((p, i) => this.tweens.add({
        targets: p, scale: this.stageConfigs[this.stageIndex].players[i].scale * scaleRatio, duration: 1000, ease: 'Sine.easeInOut', onComplete: () => this.updateBodyToMatchScale(p)
      }));
      this.updateAllEnemiesScale(this.stageConfigs[this.stageIndex].enemies.regular.scale * scaleRatio);
      this.groups.bullet!.getMatching('active', true).forEach(b => this.tweens.add({
        targets: b, scale: this.scales.bullet * scaleRatio, duration: 1000, ease: 'Sine.easeInOut', onComplete: () => this.updateBodyToMatchScale(b)
      }));
    }
  }

  private updateAllEnemiesScale(targetScale: number): void {
    Object.values(this.groups).forEach(g => g?.getMatching('active', true).forEach(e => this.tweens.add({
      targets: e, scale: targetScale, duration: 1000, ease: 'Sine.easeInOut', onComplete: () => this.updateBodyToMatchScale(e)
    })));
  }

  private addPlayer(playerKey: string, side: 'right' | 'left'): void {
    if (this.players.length >= 3) return;
    const config = this.stageConfigs[this.stageIndex].players[this.players.length];
    const x = side === 'right' ? this.playerCenter.x + this.spacing : this.playerCenter.x - this.spacing;
    const player = this.physics.add.sprite(x, this.playerCenter.y, playerKey).setDepth(0) as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    player.setScale(config.scale * this.bg.scale / this.scales.initial);
    this.updateBodyToMatchScale(player);
    player.setData('health', config.health);
    this.players.push(player);
    this.updatePlayerPositions();
  }

  private handlePlayerCollision(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody): void {
    const health = player.getData('health') - 1;
    player.setData('health', health);
    if (health <= 0) {
      this.players = this.players.filter(p => p !== player);
      player.destroy();
      if (!this.isMuted) this.sounds.cat?.play();
      if (this.players.length === 0) this.showGameOverScreen();
      else this.updatePlayerPositions();
    }
  }

  private showGameOverScreen(): void {
    this.isGameStarted = false;
    this.isGamePaused = true;
    this.physics.world.isPaused = true;
    Object.values(this.timers).forEach(t => t && (t.paused = true));
    this.sounds.bgm?.stop();

    ['scoreText', 'timerText', 'finalBossKillText', 'muteButton', 'pauseButton', 'resetButton'].forEach(k => this.ui.texts[k]?.setVisible(false));
    ['muteButtonBg', 'pauseButtonBg', 'resetButtonBg'].forEach(k => this.ui.graphics[k]?.setVisible(false));
    (['enemy', 'bossDog', 'bossTank', 'bossWeini'] as const).forEach(k => { this.ui.texts[k]?.setVisible(false); this.ui.graphics[`${k}Icon`]?.setVisible(false); });

    const { width, height } = this.getGameSize();
    this.ui.graphics.gameOverMask = this.add.graphics().fillStyle(0x000000, 0.7).fillRect(0, 0, width, height).setDepth(15);
    const panelWidth = 380, panelHeight = 400, panelX = width / 2 - panelWidth / 2, panelY = height / 2 - panelHeight / 2;
    this.ui.graphics.gameOverPanel = this.add.graphics().fillStyle(0x222222).lineStyle(4, 0xff1e1e)
      .fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 16).strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 16).setDepth(16)
      .setInteractive(new Phaser.Geom.Rectangle(panelX, panelY, panelWidth, panelHeight), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', () => {
        ['gameOverTitle', 'finalScore', 'gameOverPanel', 'gameOverMask', 'gameOverCountTitle', 'shareButton'].forEach(k => { this.ui.texts[k]?.destroy(); this.ui.graphics[k]?.destroy(); });
        (['enemy', 'bossDog', 'bossTank', 'bossWeini'] as const).forEach(k => { this.ui.texts[k]?.destroy(); this.ui.graphics[`${k}Icon`]?.destroy(); });
        this.score *= 2;
        this.ui.texts.scoreText.setText(`积分: ${this.score}`);
        this.sounds.bgm?.stop();
        this.scene.restart();
      });

    this.ui.texts.gameOverTitle = this.add.text(width / 2, panelY + 50, '游戏结束', { fontSize: '48px', color: '#ff1e1e', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 6, align: 'center' }).setOrigin(0.5).setDepth(17);
    this.ui.texts.finalScore = this.add.text(width / 2, panelY + 110, `最终得分: ${this.score}`, { fontSize: '32px', color: '#ffffff', fontFamily: 'Arial', stroke: '#000000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(17);
    this.ui.texts.gameOverCountTitle = this.add.text(width / 2, panelY + 160, '击杀统计', { fontSize: '28px', color: '#ffdd99', fontFamily: 'Arial', stroke: '#800000', strokeThickness: 4, align: 'center' }).setOrigin(0.5).setDepth(17);

    const iconSize = 40, startY = panelY + 200, lineSpacing = 45, iconX = panelX + 80, textX = panelX + 140;
    (['enemy', 'bossDog', 'bossTank', 'bossWeini'] as const).forEach((key, i) => {
      if (this.killCounts[key] > 0) {
        this.ui.graphics[`${key}Icon`] = this.add.image(iconX, startY + lineSpacing * i, key).setOrigin(0.5).setDisplaySize(iconSize, iconSize).setDepth(17);
        this.ui.texts[key] = this.add.text(textX, startY + lineSpacing * i, `x ${this.killCounts[key]}`, { fontSize: '24px', color: '#ffdd99', fontFamily: 'Arial', stroke: '#800000', strokeThickness: 3, align: 'left' }).setOrigin(0).setDepth(17);
      }
    });

    this.setupButton('shareButton', width / 2, panelY + panelHeight + 80, '📷 分享战绩', '#7d49f5ff', '#350404ff', 0xffdd1e, () => this.captureAndDownloadScreenshot(), 180, 50, true);
    this.ui.texts.shareButton?.setDepth(18);
    this.ui.graphics.shareButtonBg?.setDepth(17);
  }

private captureAndDownloadScreenshot(): void {
  const { width, height } = this.getGameSize();
  // Create a temporary RenderTexture to capture the entire scene
  const rt = this.add.renderTexture(0, 0, width, height).setOrigin(0);
  // Draw the entire scene to the RenderTexture
  rt.draw(this.children.list);
  // Capture the snapshot
  rt.snapshot((snapshot: HTMLImageElement | Phaser.Display.Color) => {
    let dataUrl: string;
    if (snapshot instanceof HTMLImageElement) {
      // Handle HTMLImageElement
      dataUrl = snapshot.src;
    } else {
      // Handle Phaser.Display.Color (single color snapshot)
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = `rgba(${snapshot.red}, ${snapshot.green}, ${snapshot.blue}, ${snapshot.alpha})`;
        ctx.fillRect(0, 0, width, height);
        dataUrl = canvas.toDataURL('image/png');
        canvas.remove();
      } else {
        console.error('Failed to get 2D canvas context');
        rt.destroy();
        return;
      }
    }
    // Create download link
    const link = document.createElement('a');
    link.download = `${this.name}_战绩_${new Date().toISOString().replace(/[:.]/g, '_')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Clean up the RenderTexture
    rt.destroy();
  });
}

  private updatePlayerPositions(): void {
    if (!this.players.length) return;
    const { width } = this.getGameSize();
    const totalWidth = (this.players.length - 1) * this.spacing;
    this.playerCenter.x = Phaser.Math.Clamp(this.playerCenter.x, 50 + totalWidth / 2, width - 50 - totalWidth / 2);
    this.players.forEach((player, i) => player.setPosition(this.playerCenter.x + (i - (this.players.length - 1) / 2) * this.spacing, this.playerCenter.y).setVelocity(0, 0));
  }

  private toggleMute(): void {
    if (!this.isGameStarted) return;
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.sound.stopAll();
    else if (this.isGameStarted && !this.isGamePaused) this.sounds.bgm?.play();
    this.ui.texts.muteButton?.setText(this.isMuted ? '🔊 播放' : '🔇 静音');
    this.ui.graphics.muteButtonBg?.destroy();
    this.ui.graphics.muteButtonBg = this.add.graphics().fillStyle(this.isMuted ? 0x32cd32 : 0xb22222).lineStyle(2, 0xffffff)
      .fillRoundedRect(20, 20, 100, 48, 8).strokeRoundedRect(20, 20, 100, 48, 8).setDepth(9);
  }

  private togglePause(): void {
    if (!this.isGameStarted) return;
    this.isGamePaused = !this.isGamePaused;
    this.physics.world.isPaused = this.isGamePaused;
    Object.values(this.timers).forEach(t => t && (t.paused = this.isGamePaused));
    this.sounds.bgm?.[this.isGamePaused || this.isMuted ? 'pause' : 'play']();
    this.ui.texts.pauseButton?.setText(this.isGamePaused ? '▶️ 继续' : '⏸️ 暂停');
    this.ui.graphics.pauseButtonBg?.destroy();
    this.ui.graphics.pauseButtonBg = this.add.graphics().fillStyle(this.isGamePaused ? 0x32cd32 : 0x228b22).lineStyle(2, 0xffffff)
      .fillRoundedRect(20, 80, 100, 48, 8).strokeRoundedRect(20, 80, 100, 48, 8).setDepth(9);
  }

  private resetGame(): void {
    this.resetForRestart();
    this.scene.restart();
  }

  private startGame(): void {
    this.isGameStarted = true;
    this.isGamePaused = false;
    ['startButton', 'titleText'].forEach(k => this.ui.texts[k]?.setVisible(false).disableInteractive());
    if (this.ui.graphics.startButtonBg instanceof Phaser.GameObjects.Graphics) {
      this.ui.graphics.startButtonBg.clear().disableInteractive();
    } else {
      this.ui.graphics.startButtonBg?.destroy();
    }
    this.setupControlButton('muteButton', 20, 20, '🔇 静音', '#ffcccc', '#800000', 0xb22222, () => this.toggleMute(), 100, 48, true);
    this.setupControlButton('pauseButton', 20, 80, '⏸️ 暂停', '#ccffcc', '#008000', 0x228b22, () => this.togglePause(), 100, 48, true);
    this.setupControlButton('resetButton', 20, 140, '🔄 重置', '#feffccff', '#c7a902ff', 0xffdd1e, () => this.resetGame(), 100, 48, true);
    ['muteButton', 'pauseButton', 'resetButton'].forEach(k => { this.ui.texts[k]?.setVisible(true); this.ui.graphics[`${k}Bg`]?.setVisible(true); });
    ['scoreText', 'timerText'].forEach(k => this.ui.texts[k]?.setVisible(true));
    Object.values(this.timers).forEach(t => t && (t.paused = false));
    if (!this.isMuted) this.sounds.bgm?.play();
    if (this.sound instanceof Phaser.Sound.WebAudioSoundManager && this.sound.context.state === 'suspended') this.sound.context.resume();
  }

  private updateTimers(): void {
    Object.values(this.timers).forEach(t => t?.remove());
    this.setupTimers();
    const config = this.stageConfigs[this.stageIndex];
    this.groups.enemy!.maxSize = config.enemies.regular.maxCount!;
    this.groups.bossDog!.maxSize = config.enemies.bossDog.maxCount!;
    this.groups.bossTank!.maxSize = config.enemies.bossTank.maxCount!;
    if (this.isGameStarted && !this.isGamePaused) Object.values(this.timers).forEach(t => t && (t.paused = false));
  }

  update(time: number, delta: number): void {
    if (!this.isGameStarted || this.isGamePaused || !this.players.length) return;
    const { width, height } = this.getGameSize();
    const config = this.stageConfigs[this.stageIndex];
    let movement = new Phaser.Math.Vector2(0, 0);

    if (this.controlKeys.right.isDown || this.controlKeys.left.isDown || this.controlKeys.up.isDown || this.controlKeys.down.isDown) {
      if (this.controlKeys.right.isDown) movement.x += 1;
      if (this.controlKeys.left.isDown) movement.x -= 1;
      if (this.controlKeys.up.isDown) movement.y -= 1;
      if (this.controlKeys.down.isDown) movement.y += 1;
      const speed = (movement.x === 0 || movement.y === 0 ? config.players[0].speed : config.players[0].speed / Math.sqrt(2)) * (delta / 1000);
      this.playerCenter.x += movement.x * speed;
      this.playerCenter.y += movement.y * speed;
      if (movement.x !== 0) this.players.forEach(p => p.setFlipX(movement.x < 0));
    } else if (this.touch.start) {
      const dx = this.touch.start.x - this.playerCenter.x, dy = this.touch.start.y - this.playerCenter.y, distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 5) {
        const touchSpeed = config.players[0].speed * 3 * (delta / 1000), moveDistance = Math.min(distance, touchSpeed);
        this.playerCenter.x += (dx / distance) * moveDistance;
        this.playerCenter.y += (dy / distance) * moveDistance;
        if (dx !== 0) this.players.forEach(p => p.setFlipX(dx < 0));
      }
    }

    this.playerCenter.x = Phaser.Math.Clamp(this.playerCenter.x, 50 + (this.players.length - 1) * this.spacing / 2, width - 50 - (this.players.length - 1) * this.spacing / 2);
    this.playerCenter.y = Phaser.Math.Clamp(this.playerCenter.y, 50, height - 50);
    this.updatePlayerPositions();

    const moveEntity = (entity: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, speed: number) => {
      if (entity.x < -50 || entity.x > width + 50 || entity.y < -50 || entity.y > height + 50) {
        entity.setActive(false).setVisible(false).body.checkCollision.none = true;
      } else {
        this.physics.moveToObject(entity, this.players[0], speed);
        entity.setFlipX(this.players[0].x < entity.x);
      }
    };

    this.groups.enemy!.getMatching('active', true).forEach(e => moveEntity(e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, config.enemies.regular.speed));
    this.groups.bossDog!.getMatching('active', true).forEach(e => moveEntity(e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, config.enemies.bossDog.speed));
    this.groups.bossTank!.getMatching('active', true).forEach(e => moveEntity(e as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, config.enemies.bossTank.speed));
    this.groups.finalBoss!.getMatching('active', true).forEach(b => {
      const bossKey = b.getData('bossKey') as 'bossDog' | 'bossTank' | 'bossWeini';
      moveEntity(b as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, config.enemies[bossKey].speed);
    });
    this.groups.bullet!.getMatching('active', true).forEach(b => {
      if (b.x < -50 || b.x > width + 50 || b.y < -50 || b.y > height + 50) b.setActive(false).setVisible(false).body.checkCollision.none = true;
    });
  }
}