/**
 * Pixel Farm - A Stardew Valley inspired farming game
 * Pure JavaScript + HTML5 Canvas
 */

class PixelFarm {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 32;
        this.mapWidth = 20;
        this.mapHeight = 15;
        
        // Game state
        this.player = { x: 10, y: 7, dir: 'down', frame: 0 };
        this.money = 100;
        this.day = 1;
        this.season = 'Spring';
        this.time = 6 * 60; // Minutes from midnight
        this.timeSpeed = 2; // Minutes per tick
        this.paused = false;
        
        // Selected tool
        this.selectedTool = 'hand';
        
        // Map tiles
        this.tiles = [];
        this.crops = [];
        
        // Crop definitions
        this.cropTypes = {
            turnip: { name: 'Turnip', stages: 3, growTime: 3, sellPrice: 15, emoji: '🥔' },
            potato: { name: 'Potato', stages: 4, growTime: 5, sellPrice: 25, emoji: '🥔' },
            corn: { name: 'Corn', stages: 5, growTime: 7, sellPrice: 40, emoji: '🌽' }
        };
        
        this.init();
    }
    
    init() {
        this.generateMap();
        this.setupInput();
        this.setupInventory();
        this.gameLoop();
    }
    
    generateMap() {
        // Initialize empty tiles
        for (let y = 0; y < this.mapHeight; y++) {
            this.tiles[y] = [];
            this.crops[y] = [];
            for (let x = 0; x < this.mapWidth; x++) {
                // Create different terrain types
                const noise = Math.random();
                let type = 'grass';
                if (noise < 0.1) type = 'water';
                else if (noise < 0.2) type = 'tree';
                else if (noise < 0.35) type = 'dirt';
                
                this.tiles[y][x] = { type, watered: false };
                this.crops[y][x] = null;
            }
        }
    }
    
    setupInput() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (this.paused) return;
            
            switch(e.key.toLowerCase()) {
                case 'w': case 'arrowup': this.movePlayer(0, -1); break;
                case 's': case 'arrowdown': this.movePlayer(0, 1); break;
                case 'a': case 'arrowleft': this.movePlayer(-1, 0); break;
                case 'd': case 'arrowright': this.movePlayer(1, 0); break;
                case ' ': case 'e': case 'enter': this.action(); break;
                case '1': this.selectTool('hand'); break;
                case '2': this.selectTool('hoe'); break;
                case '3': this.selectTool('seed'); break;
                case '4': this.selectTool('water'); break;
                case '5': this.selectTool('harvest'); break;
            }
        });
        
        // Click on canvas to interact
        this.canvas.addEventListener('click', (e) => {
            if (this.paused) return;
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.tileSize);
            const y = Math.floor((e.clientY - rect.top) / this.tileSize);
            
            // Check if clicking adjacent tile
            const dx = Math.abs(x - this.player.x);
            const dy = Math.abs(y - this.player.y);
            if (dx + dy === 1) {
                this.interact(x, y);
            }
        });
    }
    
    setupInventory() {
        const slots = document.querySelectorAll('.inv-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                slots.forEach(s => s.classList.remove('active'));
                slot.classList.add('active');
                this.selectedTool = slot.dataset.tool;
            });
        });
    }
    
    selectTool(tool) {
        this.selectedTool = tool;
        document.querySelectorAll('.inv-slot').forEach(s => {
            s.classList.toggle('active', s.dataset.tool === tool);
        });
    }
    
    movePlayer(dx, dy) {
        const newX = this.player.x + dx;
        const newY = this.player.y + dy;
        
        // Check bounds
        if (newX < 0 || newX >= this.mapWidth || newY < 0 || newY >= this.mapHeight) {
            return;
        }
        
        // Check collision with trees and water
        const tile = this.tiles[newY][newX];
        if (tile.type === 'tree' || tile.type === 'water') {
            return;
        }
        
        // Update position and direction
        this.player.x = newX;
        this.player.y = newY;
        if (dx > 0) this.player.dir = 'right';
        else if (dx < 0) this.player.dir = 'left';
        else if (dy > 0) this.player.dir = 'down';
        else if (dy < 0) this.player.dir = 'up';
        
        this.player.frame++;
    }
    
    action() {
        // Interact with tile in front of player
        let targetX = this.player.x;
        let targetY = this.player.y;
        
        switch(this.player.dir) {
            case 'up': targetY--; break;
            case 'down': targetY++; break;
            case 'left': targetX--; break;
            case 'right': targetX++; break;
        }
        
        if (targetX >= 0 && targetX < this.mapWidth && targetY >= 0 && targetY < this.mapHeight) {
            this.interact(targetX, targetY);
        }
    }
    
    interact(x, y) {
        const tile = this.tiles[y][x];
        const crop = this.crops[y][x];
        
        switch(this.selectedTool) {
            case 'hoe':
                if (tile.type === 'grass') {
                    tile.type = 'dirt';
                    this.showMessage('Dug soil!');
                }
                break;
                
            case 'seed':
                if (tile.type === 'dirt' && !crop) {
                    this.crops[y][x] = {
                        type: 'turnip',
                        stage: 0,
                        daysGrown: 0,
                        watered: false
                    };
                    this.showMessage('Planted turnip seed!');
                }
                break;
                
            case 'water':
                if (tile.type === 'dirt') {
                    tile.watered = true;
                    if (crop) crop.watered = true;
                    this.showMessage('Watered!');
                }
                break;
                
            case 'harvest':
                if (crop && crop.stage >= this.cropTypes[crop.type].stages - 1) {
                    const cropInfo = this.cropTypes[crop.type];
                    this.money += cropInfo.sellPrice;
                    this.crops[y][x] = null;
                    this.showMessage(`Harvested ${cropInfo.name}! +$${cropInfo.sellPrice}`);
                    this.updateUI();
                }
                break;
        }
    }
    
    showMessage(text) {
        const msg = document.getElementById('message');
        msg.textContent = text;
        msg.style.display = 'block';
        setTimeout(() => {
            msg.style.display = 'none';
        }, 2000);
    }
    
    updateTime() {
        if (this.paused) return;
        
        this.time += this.timeSpeed;
        
        // Day ends at 2 AM
        if (this.time >= 26 * 60) {
            this.sleep();
        }
        
        this.updateUI();
    }
    
    sleep() {
        this.time = 6 * 60; // 6 AM
        this.day++;
        
        // Grow crops
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.tiles[y][x];
                const crop = this.crops[y][x];
                
                // Reset watered status
                tile.watered = false;
                
                if (crop && crop.watered) {
                    crop.daysGrown++;
                    crop.watered = false;
                    
                    const cropInfo = this.cropTypes[crop.type];
                    const growthPerStage = cropInfo.growTime / cropInfo.stages;
                    crop.stage = Math.min(cropInfo.stages - 1, Math.floor(crop.daysGrown / growthPerStage));
                }
            }
        }
        
        this.showMessage(`Good morning! Day ${this.day}`);
    }
    
    togglePause() {
        this.paused = !this.paused;
        if (this.paused) {
            this.showMessage('Game Paused');
        }
    }
    
    save() {
        const saveData = {
            player: this.player,
            money: this.money,
            day: this.day,
            season: this.season,
            time: this.time,
            tiles: this.tiles,
            crops: this.crops
        };
        localStorage.setItem('pixelFarmSave', JSON.stringify(saveData));
        this.showMessage('Game Saved!');
    }
    
    load() {
        const saveData = localStorage.getItem('pixelFarmSave');
        if (saveData) {
            const data = JSON.parse(saveData);
            this.player = data.player;
            this.money = data.money;
            this.day = data.day;
            this.season = data.season;
            this.time = data.time;
            this.tiles = data.tiles;
            this.crops = data.crops;
            this.showMessage('Game Loaded!');
            this.updateUI();
        } else {
            this.showMessage('No save found!');
        }
    }
    
    updateUI() {
        const hours = Math.floor(this.time / 60);
        const minutes = this.time % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
        
        document.getElementById('day-display').textContent = `📅 Day ${this.day} - ${this.season}`;
        document.getElementById('time-display').textContent = `🕐 ${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        document.getElementById('money-display').textContent = `💰 $${this.money}`;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid/map
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tile = this.tiles[y][x];
                const px = x * this.tileSize;
                const py = y * this.tileSize;
                
                // Draw tile background
                switch(tile.type) {
                    case 'grass':
                        this.ctx.fillStyle = tile.watered ? '#4a7c59' : '#5d8c3a';
                        break;
                    case 'dirt':
                        this.ctx.fillStyle = tile.watered ? '#5d4e37' : '#8b7355';
                        break;
                    case 'water':
                        this.ctx.fillStyle = '#4a90d9';
                        break;
                    case 'tree':
                        this.ctx.fillStyle = '#5d8c3a';
                        break;
                }
                this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                
                // Draw tile details
                this.ctx.font = '20px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                
                switch(tile.type) {
                    case 'tree':
                        this.ctx.fillText('🌲', px + this.tileSize/2, py + this.tileSize/2);
                        break;
                    case 'water':
                        this.ctx.fillText('💧', px + this.tileSize/2, py + this.tileSize/2);
                        break;
                    case 'dirt':
                        if (tile.watered) {
                            this.ctx.fillStyle = 'rgba(100, 149, 237, 0.3)';
                            this.ctx.fillRect(px, py, this.tileSize, this.tileSize);
                        }
                        break;
                }
                
                // Draw crops
                const crop = this.crops[y][x];
                if (crop) {
                    const cropInfo = this.cropTypes[crop.type];
                    const emojis = ['🌱', '🌿', cropInfo.emoji];
                    this.ctx.font = '24px Arial';
                    this.ctx.fillText(emojis[Math.min(crop.stage, emojis.length - 1)], 
                        px + this.tileSize/2, py + this.tileSize/2);
                }
                
                // Draw grid lines
                this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                this.ctx.strokeRect(px, py, this.tileSize, this.tileSize);
            }
        }
        
        // Draw player
        const px = this.player.x * this.tileSize;
        const py = this.player.y * this.tileSize;
        
        // Player shadow
        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(px + this.tileSize/2, py + this.tileSize - 5, 12, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Player sprite
        this.ctx.font = '28px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Bobbing animation
        const bob = Math.sin(this.player.frame * 0.3) * 2;
        
        // Direction sprites
        const sprites = {
            down: '🧑',
            up: '👤',
            left: '🚶',
            right: '🚶'
        };
        
        this.ctx.save();
        if (this.player.dir === 'right') {
            this.ctx.scale(-1, 1);
            this.ctx.fillText(sprites[this.player.dir], -(px + this.tileSize/2), py + this.tileSize/2 + bob);
        } else {
            this.ctx.fillText(sprites[this.player.dir], px + this.tileSize/2, py + this.tileSize/2 + bob);
        }
        this.ctx.restore();
        
        // Highlight tile in front of player
        let highlightX = this.player.x;
        let highlightY = this.player.y;
        switch(this.player.dir) {
            case 'up': highlightY--; break;
            case 'down': highlightY++; break;
            case 'left': highlightX--; break;
            case 'right': highlightX++; break;
        }
        
        if (highlightX >= 0 && highlightX < this.mapWidth && highlightY >= 0 && highlightY < this.mapHeight) {
            this.ctx.strokeStyle = '#7ee787';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(highlightX * this.tileSize + 2, highlightY * this.tileSize + 2, 
                this.tileSize - 4, this.tileSize - 4);
            this.ctx.lineWidth = 1;
        }
    }
    
    gameLoop() {
        // Update
        if (!this.paused && Math.random() < 0.05) {
            this.updateTime();
        }
        
        // Render
        this.render();
        
        // Next frame
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start game
const game = new PixelFarm();