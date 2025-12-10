const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const obstacleCountElement = document.getElementById("obstacleCount");
const gameOverElement = document.getElementById("gameOver");
const rewardScreenElement = document.getElementById("rewardScreen");
const rewardButton = document.getElementById("rewardButton");
const rotationInstructionScreen = document.getElementById(
  "rotationInstructionScreen"
);
const rotationInstructionButton = document.getElementById(
  "rotationInstructionButton"
);
const rewardVideo = document.getElementById("rewardVideo");
const rotationWarningScreen = document.getElementById("rotationWarningScreen");
const rotationConfirmButton = document.getElementById("rotationConfirmButton");
const menuScreen = document.getElementById("menuScreen");
const startGameButton = document.getElementById("startGameButton");
const gameContainer = document.querySelector(".game-container");
const sneakPeekImage = document.querySelector(".sneak-peek-image");

// Set canvas size
function resizeCanvas() {
  if (canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0) {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
}

// Wait for DOM to be ready before initializing canvas
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    resizeCanvas();
  });
} else {
  resizeCanvas();
}

window.addEventListener("resize", () => {
  resizeCanvas();
  if (gameState.running) {
    initSnowflakes(); // Reinitialize snowflakes on resize
  }
});

// Game state
let gameState = {
  running: false, // Start as false, will be set to true when game starts
  score: 0,
  obstaclesPassed: 0,
  finishLineReached: false,
  gameOverMessage: null,
  rewardScreenShown: false,
  health: 3, // 3 lives
};

// Start message state
let startMessageState = {
  show: false,
  startTime: 0,
  fadeStartTime: 0,
  duration: 2500, // Show for 2.5 seconds
  fadeDuration: 500, // Fade out over 0.5 seconds
};

// Game over messages (random selection)
const gameOverMessages = [
  "Typický český turista v Tatrách 🏔️",
  "A to ma chceš učiť snowboardovať? 😅",
  "Nechceš radšej vyskúšať lyže? ⛷️",
];

// Slope parameters
// Tilted by ~2 degrees more: atan(0.35) ≈ 19.3°, new angle ≈ 21.3°, tan(21.3°) ≈ 0.39
const SLOPE_ANGLE = 0.44; // Slope angle (rise/run ratio) - increased for more tilt
const SLOPE_START_Y = 400; // Starting Y position of slope at left edge

// Player (snowboarder)
const player = {
  x: 100,
  y: 500,
  width: 120,
  height: 150,
  normalHeight: 150, // Normal standing height
  crouchHeight: 99, // Crouched height (60% of normal)
  velocityY: 0,
  isJumping: false,
  isCrouching: false,
  groundY: 300,
  jumpPower: -10,
  gravity: 0.2,
  color: "#FF6B6B",
  hitAnimation: {
    active: false,
    duration: 500, // Animation duration in milliseconds
    startTime: 0,
    shakeIntensity: 8, // Pixels of shake
    zoomAmount: 1.2, // Zoom factor (1.2 = 20% zoom in)
  },
};

// Character images
const playerImage = new Image();
const playerJumpImage = new Image();
const playerCrouchImage = new Image();
const playerScreamingImage = new Image();
let imagesLoaded = 0;
const totalImages = 5; // Updated to include background image, screaming image, and crouch image

// Load character images
playerImage.src = "lucka_on_snowboard.png";
playerJumpImage.src = "lucka_jump.png";
playerCrouchImage.src = "lucka_crouch.png";
playerScreamingImage.src = "lucka_on_sb_screaming.png";

// Background image
const backgroundImage = new Image();
backgroundImage.src = "strbske2.jpeg";

// Track when images are loaded
playerImage.onload = () => {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    console.log("All character images loaded");
  }
};

playerJumpImage.onload = () => {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    console.log("All character images loaded");
  }
};

playerCrouchImage.onload = () => {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    console.log("All character images loaded");
  }
};

playerScreamingImage.onload = () => {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    console.log("All character images loaded");
  }
};

backgroundImage.onload = () => {
  imagesLoaded++;
  if (imagesLoaded === totalImages) {
    console.log("All character images loaded");
  }
};

// Obstacle images
const obstacleImages = [];
const obstacleImageFiles = [
  "obstacles/tree.png",
  "obstacles/ja_shelby.png",
  "obstacles/three-trees.png",
  "obstacles/iphone.png",
  "obstacles/julca.png",
  "obstacles/ja.png",
  "obstacles/luna.png",
  "obstacles/ja_mikulov.png",
  "obstacles/sasa.png",
  "obstacles/tree2.png",
  "obstacles/lieky.png",
  "obstacles/lucka_kucharka.png",
  "obstacles/sestry.png",
];

// Load all obstacle images
obstacleImageFiles.forEach((src) => {
  const img = new Image();
  img.src = src;
  obstacleImages.push(img);
});

// Lift car image
const liftCarImage = new Image();
liftCarImage.src = "obstacles/cabin.png";

// Function to calculate ground Y at a given X position
function getGroundY(x) {
  return SLOPE_START_Y + x * SLOPE_ANGLE;
}

// Obstacles array
const obstacles = [];
// Lift cars array (ski lift obstacles)
const liftCars = [];
// Lift cable height above ground (in pixels)
// Positioned so standing player collides, but crouching doesn't
// Player top when standing: ground - 150 + 80 = ground - 70
// Player top when crouching: ground - 99 + 80 = ground - 19
// Lift car bottom should be between ground - 70 and ground - 19
// Setting lift car bottom at ground - 45 (midway between -70 and -19)
// If lift car height is 100, then lift car top is at ground - 145
// So cable should be at ground - 145 (lift car hangs from cable)
const LIFT_CABLE_HEIGHT = 275; // Height above ground where cable runs (shifted up by 100px to accommodate 2x larger car)
const LIFT_CAR_HEIGHT = 200; // Height of lift car hanging from cable (2x larger)
const finishLine = {
  x: null,
  y: 0,
  width: 20,
  height: canvas.height,
  passed: false,
};

// Game settings
// Fixed sequence: 12 obstacles (each used once) + 12 cablecars = 24 total
// Pattern: O=obstacle, C=cablecar
// Sequence: O, O, C, C, O, C, O, O, C, O, C, C, O, C, O, C, O, C, C, O, C, O, C, O
const OBSTACLE_SEQUENCE = [
  "obstacle",
  "obstacle",
  "cablecar",
  "cablecar",
  "obstacle",
  "cablecar",
  "obstacle",
  "obstacle",
  "cablecar",
  "obstacle",
  "cablecar",
  "obstacle",
  "cablecar",
  "obstacle",
  "cablecar",
  "obstacle",
  "cablecar",
  "obstacle",
  "obstacle",
  "cablecar",
  "cablecar",
  "obstacle",
  "cablecar",
  "cablecar",
  "obstacle",
];
const TOTAL_ITEMS = OBSTACLE_SEQUENCE.length; // 25 items total

// Individual spacing after each obstacle/cablecar (distance to next item)
// Each value corresponds to the spacing after the item at that index
// Default: 400 for all (current default spacing)
const OBSTACLE_SPACINGS = [
  400, // spacing after obstacle 0
  400, // spacing after obstacle 1
  400, // spacing after cablecar 2
  400, // spacing after cablecar 3
  400, // spacing after obstacle 4
  400, // spacing after cablecar 5
  400, // spacing after obstacle 6
  400, // spacing after obstacle 7
  400, // spacing after cablecar 8
  400, // spacing after obstacle 9
  400, // spacing after cablecar 10
  400, // spacing after obstacle 11
  400, // spacing after cablecar 12
  250, // spacing after obstacle 13
  300, // spacing after cablecar 14
  400, // spacing after obstacle 15
  250, // spacing after cablecar 16
  50, // spacing after obstacle 17
  400, // spacing after obstacle 18
  300, // spacing after cablecar 19
  250, // spacing after cablecar 20
  300, // spacing after obstacle 21
  150, // spacing after cablecar 22
  400, // spacing after cablecar 23
  400, // spacing after obstacle 24 (last item, spacing to finish line)
];
const SCROLL_SPEED = 3;
let gameScroll = 0;
const BACKGROUND_SCROLL_SPEED = 0.25; // Background moves slower than obstacles for parallax effect (reduced for longer game)
const BACKGROUND_SCROLL_SPEED_Y = 0.122; // Vertical scroll speed (downward) (reduced for longer game)
const BACKGROUND_ZOOM = 1.3; // Zoom factor (1.3 = 30% zoom in)
let backgroundScroll = 0;
let backgroundScrollY = 0;

// Snowflakes array
const snowflakes = [];
const SNOWFLAKE_COUNT = 50;

// Initialize snowflakes
function initSnowflakes() {
  snowflakes.length = 0;
  for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
    snowflakes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 1.5 + 0.5,
      speedX: Math.random() * 0.5 + 0.2, // Slight rightward drift
      opacity: Math.random() * 0.5 + 0.5,
    });
  }
}

// Update snowflakes
function updateSnowflakes() {
  const avgSlopeY = (getGroundY(0) + getGroundY(canvas.width)) / 2;

  snowflakes.forEach((flake) => {
    // Move snowflake down and slightly right
    flake.y += flake.speedY;
    flake.x += flake.speedX;

    // Account for camera scroll (snowflakes should move slightly left relative to camera)
    flake.x -= SCROLL_SPEED * 0.1;

    // Reset if off screen
    if (flake.y > avgSlopeY || flake.y > canvas.height) {
      flake.y = -10;
      flake.x = Math.random() * canvas.width;
    }

    // Reset if off screen horizontally
    if (flake.x < -10) {
      flake.x = canvas.width + 10;
      flake.y = Math.random() * avgSlopeY;
    } else if (flake.x > canvas.width + 10) {
      flake.x = -10;
      flake.y = Math.random() * avgSlopeY;
    }
  });
}

// Initialize lift cars on the cable
// This must be called before initObstacles() to prevent overlap
function initLiftCars() {
  liftCars.length = 0;

  // Place lift cars according to the fixed sequence
  let currentX = 1500; // Starting X position
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    if (OBSTACLE_SEQUENCE[i] === "cablecar") {
      // Calculate Y position on the cable (cable follows slope angle)
      const groundY = getGroundY(currentX);
      const cableY = groundY - LIFT_CABLE_HEIGHT;

      liftCars.push({
        x: currentX,
        y: cableY + 10, // Top of lift car (hangs from cable at cableY, positioned 10px lower)
        width: 160, // Width of lift car (2x larger)
        height: LIFT_CAR_HEIGHT, // Height of lift car (hangs down from cable)
        passed: false,
        hit: false, // Track if this lift car has already caused damage
      });
    }

    // Move to next position: add spacing after current item
    currentX += OBSTACLE_SPACINGS[i];
  }
}

// Initialize obstacles
// This must be called after initLiftCars() to prevent overlap
function initObstacles() {
  obstacles.length = 0;

  // Create a Set of X positions that have lift cars to avoid overlap
  const liftCarPositions = new Set();
  liftCars.forEach((liftCar) => {
    liftCarPositions.add(liftCar.x);
  });

  // Use each obstacle image exactly once, in order
  let obstacleImageIndex = 0; // Index to track which obstacle image to use next

  let currentX = 1500; // Starting X position (same as lift cars)
  for (let i = 0; i < TOTAL_ITEMS; i++) {
    if (OBSTACLE_SEQUENCE[i] === "obstacle") {
      // Skip this position if a lift car exists here (shouldn't happen, but safety check)
      if (liftCarPositions.has(currentX)) {
        // Still need to advance position even if we skip
        currentX += OBSTACLE_SPACINGS[i];
        continue;
      }

      // Use each obstacle image exactly once, in order
      const selectedImageIndex = obstacleImageIndex % obstacleImages.length;
      const selectedImage = obstacleImages[selectedImageIndex];
      obstacleImageIndex++;

      obstacles.push({
        x: currentX,
        y: getGroundY(currentX) - 116, // Position on slope (bottom edge on ground, adjusted upward to keep bottom fixed)
        width: 78, // 130% of previous size (was 60)
        height: 156, // 130% of previous size (was 120)
        passed: false,
        hit: false, // Track if this obstacle has already caused damage
        image: selectedImage, // Store reference to the image
        imageIndex: selectedImageIndex, // Store index for reference
      });
    }

    // Move to next position: add spacing after current item
    currentX += OBSTACLE_SPACINGS[i];
  }

  // Set finish line after last obstacle/cablecar
  // Finish line is positioned after the last item's spacing
  finishLine.x = currentX;
  finishLine.passed = false;
}

// Jump function
function jump() {
  if (!player.isJumping && gameState.running) {
    player.velocityY = player.jumpPower;
    player.isJumping = true;
    player.isCrouching = false; // Can't crouch while jumping
  }
}

// Crouch function
function crouch() {
  if (!player.isJumping && gameState.running) {
    player.isCrouching = true;
    player.height = player.crouchHeight;
  }
}

// Stop crouching
function stopCrouch() {
  if (gameState.running) {
    player.isCrouching = false;
    player.height = player.normalHeight;
  }
}

// Get touch/click position relative to canvas
function getCanvasPosition(event) {
  const rect = canvas.getBoundingClientRect();
  if (event.touches && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX - rect.left,
      y: event.touches[0].clientY - rect.top,
    };
  } else {
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}

// Track mouse state for crouching
let isMouseDown = false;
let mouseDownZone = null; // 'top' or 'bottom'

// Event listeners for jump (top half) and crouch (bottom half)
canvas.addEventListener("mousedown", (e) => {
  if (gameState.running) {
    const pos = getCanvasPosition(e);
    const midY = canvas.height / 2;
    isMouseDown = true;
    if (pos.y < midY) {
      // Top half - jump
      mouseDownZone = "top";
      jump();
    } else {
      // Bottom half - crouch
      mouseDownZone = "bottom";
      crouch();
    }
  }
});

canvas.addEventListener("mouseup", (e) => {
  // Stop crouching when mouse is released
  if (mouseDownZone === "bottom" && player.isCrouching && !player.isJumping) {
    stopCrouch();
  }
  isMouseDown = false;
  mouseDownZone = null;
});

canvas.addEventListener("mouseleave", (e) => {
  // Stop crouching if mouse leaves canvas
  if (player.isCrouching && !player.isJumping) {
    stopCrouch();
  }
  isMouseDown = false;
  mouseDownZone = null;
});

canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (gameState.running) {
    const pos = getCanvasPosition(e);
    const midY = canvas.height / 2;
    if (pos.y < midY) {
      // Top half - jump
      jump();
    } else {
      // Bottom half - crouch
      crouch();
    }
  }
});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  // Stop crouching when touch ends
  if (player.isCrouching && !player.isJumping) {
    stopCrouch();
  }
});

canvas.addEventListener("touchcancel", (e) => {
  e.preventDefault();
  // Stop crouching if touch is cancelled
  if (player.isCrouching && !player.isJumping) {
    stopCrouch();
  }
});

// Prevent default touch behaviors
canvas.addEventListener("touchmove", (e) => e.preventDefault());
canvas.addEventListener("touchend", (e) => e.preventDefault());

// Update player physics
function updatePlayer() {
  // Update ground Y based on current X position (slope)
  // Add offset to bring character lower on the ground (accounting for image padding)
  const groundOffset = 80; // Offset to lower character on ground (increased by 20px)
  player.groundY = getGroundY(player.x) - player.height + groundOffset;

  if (player.isJumping) {
    player.velocityY += player.gravity;
    player.y += player.velocityY;

    // Ground collision (check against sloped ground)
    const groundYAtPlayer = getGroundY(player.x) - player.height + groundOffset;
    if (player.y >= groundYAtPlayer) {
      player.y = groundYAtPlayer;
      player.velocityY = 0;
      player.isJumping = false;
      // Reset height after landing if not crouching
      if (!player.isCrouching) {
        player.height = player.normalHeight;
      }
    }
  } else {
    // Keep player on the slope when not jumping
    const groundYAtPlayer = getGroundY(player.x) - player.height + groundOffset;
    player.y = groundYAtPlayer;
  }
}

// Update obstacles and scroll
function updateObstacles() {
  gameScroll += SCROLL_SPEED;
  // Update background scroll position (moves to the right and down as snowboarder rides)
  if (gameState.running) {
    backgroundScroll += BACKGROUND_SCROLL_SPEED;
    backgroundScrollY += BACKGROUND_SCROLL_SPEED_Y;
  }

  // Update lift cars
  liftCars.forEach((liftCar) => {
    liftCar.x -= SCROLL_SPEED;

    // Update lift car Y position to follow the cable (which follows the slope)
    // Cable is at groundY - LIFT_CABLE_HEIGHT, lift car hangs down from there
    const groundY = getGroundY(liftCar.x);
    const cableY = groundY - LIFT_CABLE_HEIGHT;
    liftCar.y = cableY + 10; // Top of lift car (hangs from cable, positioned 10px lower relative to cable)

    // Check collision with lift car (only if player is NOT crouching)
    if (!liftCar.passed && !player.isCrouching) {
      // Calculate horizontal overlap
      const horizontalOverlap = Math.min(
        player.x + player.width - liftCar.x,
        liftCar.x + liftCar.width - player.x
      );

      // Calculate vertical overlap
      const verticalOverlap = Math.min(
        player.y + player.height - liftCar.y,
        liftCar.y + liftCar.height - player.y
      );

      // Check if there's basic overlap
      const hasHorizontalOverlap = horizontalOverlap > 0;
      const hasVerticalOverlap = verticalOverlap > 0;

      if (hasHorizontalOverlap && hasVerticalOverlap) {
        // Check if approaching from right side
        const isFromRight = player.x > liftCar.x;

        if (isFromRight) {
          // Calculate how much the player is shifted to the right
          const rightShift = player.x - liftCar.x;
          const maxShift = liftCar.width + player.width;
          const shiftRatio = Math.min(rightShift / maxShift, 1.0);
          const tolerance = 1.0 - shiftRatio * 0.9;
          const minRequiredOverlap =
            Math.min(player.width, liftCar.width) * tolerance;

          if (
            horizontalOverlap >= minRequiredOverlap &&
            verticalOverlap >= 20 &&
            !liftCar.hit
          ) {
            // Collision detected - reduce health
            liftCar.hit = true;
            gameState.health--;

            // Trigger hit animation
            player.hitAnimation.active = true;
            player.hitAnimation.startTime = Date.now();

            // Only game over if health reaches 0
            if (gameState.health <= 0) {
              gameState.running = false;
              if (!gameState.gameOverMessage) {
                gameState.gameOverMessage =
                  gameOverMessages[
                    Math.floor(Math.random() * gameOverMessages.length)
                  ];
              }
            }
          }
        } else {
          // Approaching from left - use normal collision detection
          if (
            horizontalOverlap >= 10 &&
            verticalOverlap >= 20 &&
            !liftCar.hit
          ) {
            // Collision detected - reduce health
            liftCar.hit = true;
            gameState.health--;

            // Trigger hit animation
            player.hitAnimation.active = true;
            player.hitAnimation.startTime = Date.now();

            // Only game over if health reaches 0
            if (gameState.health <= 0) {
              gameState.running = false;
              if (!gameState.gameOverMessage) {
                gameState.gameOverMessage =
                  gameOverMessages[
                    Math.floor(Math.random() * gameOverMessages.length)
                  ];
              }
            }
          }
        }
      }
    }

    // Mark as passed
    if (!liftCar.passed && liftCar.x + liftCar.width < player.x) {
      liftCar.passed = true;
      gameState.obstaclesPassed++;
      obstacleCountElement.textContent = gameState.obstaclesPassed;

      // Check if all obstacles are passed
      const totalObstacles = obstacles.length + liftCars.length;
      if (
        gameState.obstaclesPassed === totalObstacles &&
        !gameState.rewardScreenShown
      ) {
        gameState.rewardScreenShown = true;
        gameState.running = false;
        // Show reward screen after 1 second timeout
        setTimeout(() => {
          rewardScreenElement.classList.remove("hidden");
        }, 1000);
      }
    }
  });

  obstacles.forEach((obstacle, index) => {
    obstacle.x -= SCROLL_SPEED;

    // Update obstacle Y position to follow the slope
    obstacle.y = getGroundY(obstacle.x) - 116; // Bottom edge on ground (adjusted upward to keep bottom fixed)

    // Check collision with less strict detection when approaching from right
    if (!obstacle.passed) {
      // Calculate horizontal overlap
      const horizontalOverlap = Math.min(
        player.x + player.width - obstacle.x,
        obstacle.x + obstacle.width - player.x
      );

      // Calculate vertical overlap
      const verticalOverlap = Math.min(
        player.y + player.height - obstacle.y,
        obstacle.y + obstacle.height - player.y
      );

      // Check if there's basic overlap
      const hasHorizontalOverlap = horizontalOverlap > 0;
      const hasVerticalOverlap = verticalOverlap > 0;

      if (hasHorizontalOverlap && hasVerticalOverlap) {
        // Check if approaching from right side
        const isFromRight = player.x > obstacle.x;

        if (isFromRight) {
          // Calculate how much the player is shifted to the right
          const rightShift = player.x - obstacle.x;
          const maxShift = obstacle.width + player.width; // Maximum possible shift
          const shiftRatio = Math.min(rightShift / maxShift, 1.0);

          // Apply tolerance: the more shifted, the less strict the collision
          // Invert so that higher shift = lower required overlap (less strict)
          // Using shiftRatio directly makes it very lenient when shifted
          const tolerance = 1.0 - shiftRatio * 0.9; // 1.0 to 0.1 (very less strict as shift increases)
          const minRequiredOverlap =
            Math.min(player.width, obstacle.width) * tolerance;

          // Only trigger collision if overlap is significant enough
          if (
            horizontalOverlap >= minRequiredOverlap &&
            verticalOverlap >= 20 &&
            !obstacle.hit
          ) {
            // Collision detected - reduce health
            obstacle.hit = true;
            gameState.health--;

            // Trigger hit animation
            player.hitAnimation.active = true;
            player.hitAnimation.startTime = Date.now();

            // Only game over if health reaches 0
            if (gameState.health <= 0) {
              gameState.running = false;
              // Select random game over message
              if (!gameState.gameOverMessage) {
                gameState.gameOverMessage =
                  gameOverMessages[
                    Math.floor(Math.random() * gameOverMessages.length)
                  ];
              }
            }
          }
        } else {
          // Approaching from left - use normal collision detection
          if (
            horizontalOverlap >= 10 &&
            verticalOverlap >= 20 &&
            !obstacle.hit
          ) {
            // Collision detected - reduce health
            obstacle.hit = true;
            gameState.health--;

            // Trigger hit animation
            player.hitAnimation.active = true;
            player.hitAnimation.startTime = Date.now();

            // Only game over if health reaches 0
            if (gameState.health <= 0) {
              gameState.running = false;
              // Select random game over message
              if (!gameState.gameOverMessage) {
                gameState.gameOverMessage =
                  gameOverMessages[
                    Math.floor(Math.random() * gameOverMessages.length)
                  ];
              }
            }
          }
        }
      }
    }

    // Mark as passed
    if (!obstacle.passed && obstacle.x + obstacle.width < player.x) {
      obstacle.passed = true;
      gameState.obstaclesPassed++;
      obstacleCountElement.textContent = gameState.obstaclesPassed;

      // Check if all obstacles are passed
      const totalObstacles = obstacles.length + liftCars.length;
      if (
        gameState.obstaclesPassed === totalObstacles &&
        !gameState.rewardScreenShown
      ) {
        gameState.rewardScreenShown = true;
        gameState.running = false;
        // Show reward screen after 1 second timeout
        setTimeout(() => {
          rewardScreenElement.classList.remove("hidden");
        }, 1000);
      }
    }
  });

  // Check finish line
  if (!finishLine.passed && finishLine.x < player.x) {
    finishLine.passed = true;
    gameState.finishLineReached = true;
    gameState.running = false;
    setTimeout(() => {
      gameOverElement.classList.remove("hidden");
    }, 500);
  }
}

// Draw functions
function drawSlope() {
  // Pattern width for seamless repetition (make it longer than screen)
  const patternWidth = canvas.width * 2;
  const numPoints = 50; // More points for smoother, longer pattern
  const noiseAmplitude = 6; // Maximum vertical variation in pixels

  // Generate border Y for a given screen X coordinate
  // Use modulo on (x + gameScroll) to create seamless repeating pattern that scrolls
  function getBorderY(screenX) {
    const baseY = getGroundY(screenX);
    // Use modulo to create repeating pattern for seamless scrolling
    // Add gameScroll so the pattern moves as we scroll
    const patternX = (screenX + gameScroll) % patternWidth;
    // Add noise using sine waves with different frequencies for organic look
    const spatialNoise1 = Math.sin(patternX * 0.015) * noiseAmplitude;
    const spatialNoise2 = Math.sin(patternX * 0.035) * (noiseAmplitude * 0.5);
    const spatialNoise3 = Math.sin(patternX * 0.065) * (noiseAmplitude * 0.25);
    const totalNoise = spatialNoise1 + spatialNoise2 + spatialNoise3;
    return baseY + totalNoise;
  }

  // Generate points across the visible screen width
  const points = [];
  const pointSpacing = canvas.width / numPoints;

  for (let i = -2; i <= numPoints + 2; i++) {
    const screenX = i * pointSpacing;

    // Only include points that are visible or slightly off-screen
    if (screenX >= -50 && screenX <= canvas.width + 50) {
      points.push({
        screenX: screenX,
        y: getBorderY(screenX),
      });
    }
  }

  // Draw snow slope with wavy border
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();

  // Draw the border curve
  if (points.length > 0) {
    ctx.moveTo(points[0].screenX, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];

      if (i === 1) {
        ctx.lineTo(currentPoint.screenX, currentPoint.y);
      } else {
        ctx.quadraticCurveTo(
          prevPoint.screenX,
          prevPoint.y,
          currentPoint.screenX,
          currentPoint.y
        );
      }
    }
  }

  // Complete the border and close the path
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Draw slope border line (wavy, scrolling)
  ctx.strokeStyle = "#E0E0E0";
  ctx.lineWidth = 2;
  ctx.beginPath();

  if (points.length > 0) {
    ctx.moveTo(points[0].screenX, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];

      if (i === 1) {
        ctx.lineTo(currentPoint.screenX, currentPoint.y);
      } else {
        ctx.quadraticCurveTo(
          prevPoint.screenX,
          prevPoint.y,
          currentPoint.screenX,
          currentPoint.y
        );
      }
    }
  }
  ctx.stroke();
}

function drawPlayer() {
  // Check if hit animation is active
  let imageToUse;
  let drawX = player.x;
  let drawY = player.y;
  let drawWidth = player.width;
  let drawHeight = player.height;
  let shakeX = 0;
  let shakeY = 0;
  let zoom = 1;

  if (player.hitAnimation.active) {
    // Use screaming image during hit animation
    imageToUse = playerScreamingImage;

    // Calculate animation progress (0 to 1)
    const elapsed = Date.now() - player.hitAnimation.startTime;
    const progress = Math.min(elapsed / player.hitAnimation.duration, 1);

    // Apply shake effect (random movement that decreases over time)
    const shakeAmount = player.hitAnimation.shakeIntensity * (1 - progress);
    shakeX = (Math.random() - 0.5) * shakeAmount * 2;
    shakeY = (Math.random() - 0.5) * shakeAmount * 2;

    // Apply zoom effect (starts at max zoom, returns to normal)
    const zoomProgress = 1 - progress; // Invert so it starts zoomed and returns to normal
    zoom = 1 + (player.hitAnimation.zoomAmount - 1) * zoomProgress;

    // Calculate new dimensions with zoom
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    drawWidth = player.width * zoom;
    drawHeight = player.height * zoom;
    drawX = centerX - drawWidth / 2 + shakeX;
    drawY = centerY - drawHeight / 2 + shakeY;

    // End animation when duration is complete
    if (progress >= 1) {
      player.hitAnimation.active = false;
    }
  } else {
    // Use the appropriate image based on jump and crouch state
    if (player.isJumping) {
      imageToUse = playerJumpImage;
    } else if (player.isCrouching) {
      imageToUse = playerCrouchImage;
    } else {
      imageToUse = playerImage;
    }
  }

  // Only draw if image is loaded
  if (imageToUse.complete && imageToUse.naturalWidth > 0) {
    // When crouching, adjust the draw position to align bottom with ground
    if (
      player.isCrouching &&
      !player.isJumping &&
      !player.hitAnimation.active
    ) {
      // Crouch image is naturally smaller, so align bottom edge with ground
      // Maintain aspect ratio: crouch image is 708×670, so aspect ratio is 708/670 ≈ 1.057
      const crouchDrawHeight = player.crouchHeight;
      const crouchAspectRatio = 708 / 670; // Crouch image aspect ratio
      const crouchDrawWidth = crouchDrawHeight * crouchAspectRatio;
      const crouchDrawX = drawX + (drawWidth - crouchDrawWidth) / 2; // Center horizontally
      const crouchDrawY = drawY + (drawHeight - crouchDrawHeight); // Align bottom
      ctx.drawImage(
        imageToUse,
        crouchDrawX,
        crouchDrawY,
        crouchDrawWidth,
        crouchDrawHeight
      );
    } else {
      ctx.drawImage(imageToUse, drawX, drawY, drawWidth, drawHeight);
    }
  } else {
    // Fallback: draw a simple rectangle if image not loaded yet
    ctx.fillStyle = player.color;
    ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
  }
}

// Draw lift cable line
function drawLiftCable() {
  // Draw cable line that follows the slope angle
  ctx.strokeStyle = "#808080"; // Gray color for cable
  ctx.lineWidth = 5;
  ctx.beginPath();

  // Calculate cable Y positions at left and right edges of visible area
  const leftX = Math.max(0, -100); // Start slightly off-screen left
  const rightX = canvas.width + 100; // Extend slightly off-screen right
  const leftGroundY = getGroundY(leftX);
  const rightGroundY = getGroundY(rightX);
  const leftCableY = leftGroundY - LIFT_CABLE_HEIGHT;
  const rightCableY = rightGroundY - LIFT_CABLE_HEIGHT;

  ctx.moveTo(leftX, leftCableY);
  ctx.lineTo(rightX, rightCableY);
  ctx.stroke();
}

// Draw lift cars
function drawLiftCars() {
  liftCars.forEach((liftCar) => {
    // Only draw if lift car is visible on screen
    if (liftCar.x + liftCar.width < 0 || liftCar.x > canvas.width) {
      return;
    }

    // Use image if available and loaded, otherwise fallback to simple shape
    if (
      liftCarImage &&
      liftCarImage.complete &&
      liftCarImage.naturalWidth > 0
    ) {
      // Draw the lift car image
      // Scale the image to fit the lift car dimensions while maintaining aspect ratio
      const imageAspectRatio =
        liftCarImage.naturalWidth / liftCarImage.naturalHeight;
      let drawWidth = liftCar.width;
      let drawHeight = liftCar.height;

      // Adjust dimensions to maintain aspect ratio
      if (imageAspectRatio > 1) {
        // Image is wider than tall
        drawHeight = drawWidth / imageAspectRatio;
      } else {
        // Image is taller than wide
        drawWidth = drawHeight * imageAspectRatio;
      }

      // Position lift car hanging from cable
      // liftCar.y is the top of the lift car
      const drawX = liftCar.x + (liftCar.width - drawWidth) / 2;
      const drawY = liftCar.y; // Top of lift car

      ctx.drawImage(liftCarImage, drawX, drawY, drawWidth, drawHeight);
    } else {
      // Fallback: draw simple rectangle if image not loaded yet
      ctx.fillStyle = "#FF6B6B";
      ctx.fillRect(liftCar.x, liftCar.y, liftCar.width, liftCar.height);
    }
  });
}

function drawObstacles() {
  obstacles.forEach((obstacle) => {
    // Use image if available and loaded, otherwise fallback to simple shape
    if (
      obstacle.image &&
      obstacle.image.complete &&
      obstacle.image.naturalWidth > 0
    ) {
      // Draw the obstacle image
      // Scale the image to fit the obstacle dimensions while maintaining aspect ratio
      const imageAspectRatio =
        obstacle.image.naturalWidth / obstacle.image.naturalHeight;
      let drawWidth = obstacle.width;
      let drawHeight = obstacle.height;

      // Adjust dimensions to maintain aspect ratio
      if (imageAspectRatio > 1) {
        // Image is wider than tall
        drawHeight = drawWidth / imageAspectRatio;
      } else {
        // Image is taller than wide
        drawWidth = drawHeight * imageAspectRatio;
      }

      // Center the image on the obstacle position
      const drawX = obstacle.x + (obstacle.width - drawWidth) / 2;
      const drawY = obstacle.y + (obstacle.height - drawHeight);

      ctx.drawImage(obstacle.image, drawX, drawY, drawWidth, drawHeight);
    } else {
      // Fallback: draw simple tree shape if image not loaded yet
      // Tree trunk
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Tree top (triangle)
      ctx.fillStyle = "#228B22";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y - 40);
      ctx.lineTo(obstacle.x - 10, obstacle.y);
      ctx.lineTo(obstacle.x + obstacle.width + 10, obstacle.y);
      ctx.closePath();
      ctx.fill();

      // Snow on tree
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y - 20);
      ctx.lineTo(obstacle.x + 5, obstacle.y - 10);
      ctx.lineTo(obstacle.x + obstacle.width - 5, obstacle.y - 10);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function drawFinishLine() {
  if (finishLine.x !== null && finishLine.x < canvas.width + 200) {
    // Draw checkered finish line
    const checkSize = 15;
    for (let y = finishLine.y; y < finishLine.height; y += checkSize) {
      for (let x = 0; x < finishLine.width; x += checkSize) {
        const checkX = finishLine.x + x;
        const checkY = y;
        const isBlack =
          (Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2 === 0;
        ctx.fillStyle = isBlack ? "#000000" : "#FFFFFF";
        ctx.fillRect(checkX, checkY, checkSize, checkSize);
      }
    }

    // Finish line text
    if (finishLine.x < canvas.width) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("CIEĽ", finishLine.x + finishLine.width / 2, 50);
    }
  }
}

function drawHearts() {
  const heartSize = 30;
  const spacing = 10;
  const startX = canvas.width - (heartSize * 3 + spacing * 2) - 20; // Upper right corner with padding
  const startY = 20; // Upper right corner with padding

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (heartSize + spacing);
    const y = startY;

    // Draw heart shape
    ctx.save();
    ctx.translate(x + heartSize / 2, y + heartSize / 2);
    ctx.scale(heartSize / 20, heartSize / 20);

    // If this heart is lost (health is less than 3 - i), gray it out
    if (gameState.health <= 2 - i) {
      ctx.fillStyle = "#808080"; // Gray color
      ctx.globalAlpha = 0.5; // Make it semi-transparent
    } else {
      ctx.fillStyle = "#FF1744"; // Red color
      ctx.globalAlpha = 1.0;
    }

    ctx.beginPath();
    // Draw heart shape using bezier curves
    ctx.moveTo(0, 5);
    ctx.bezierCurveTo(-5, -5, -10, -5, -10, 0);
    ctx.bezierCurveTo(-10, 5, -5, 10, 0, 15);
    ctx.bezierCurveTo(5, 10, 10, 5, 10, 0);
    ctx.bezierCurveTo(10, -5, 5, -5, 0, 5);
    ctx.fill();

    ctx.restore();
  }
}

function drawBackground() {
  // Draw panoramic background image
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    // Scale image with zoom (larger than canvas to create zoom effect)
    const drawHeight = canvas.height * BACKGROUND_ZOOM;
    const imageAspectRatio =
      backgroundImage.naturalWidth / backgroundImage.naturalHeight;
    const scaledWidth = drawHeight * imageAspectRatio;

    // Calculate source X position in the original image (horizontal scroll)
    const scrollPositionX = backgroundScroll % scaledWidth;
    const sourceX =
      (scrollPositionX / scaledWidth) * backgroundImage.naturalWidth;

    // Calculate source Y position in the original image (vertical scroll - downward)
    // As backgroundScrollY increases, we move down through the image
    const scrollPositionY = backgroundScrollY % drawHeight;
    const sourceY =
      (scrollPositionY / drawHeight) * backgroundImage.naturalHeight;

    // Calculate how much of the image we need to draw horizontally
    const sourceWidth = Math.min(
      backgroundImage.naturalWidth - sourceX,
      (canvas.width / scaledWidth) * backgroundImage.naturalWidth
    );

    // Calculate how much of the image we need to draw vertically
    const sourceHeight = Math.min(
      backgroundImage.naturalHeight - sourceY,
      (canvas.height / drawHeight) * backgroundImage.naturalHeight
    );

    // Draw the visible portion of the background
    if (sourceWidth > 0 && sourceHeight > 0) {
      const destWidth =
        (sourceWidth / backgroundImage.naturalWidth) * scaledWidth;
      const destHeight =
        (sourceHeight / backgroundImage.naturalHeight) * drawHeight;

      // Main portion
      ctx.drawImage(
        backgroundImage,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        destWidth,
        destHeight
      );

      // Handle horizontal wrapping (right edge)
      if (destWidth < canvas.width) {
        const remainingWidth = canvas.width - destWidth;
        const wrapSourceWidth =
          (remainingWidth / scaledWidth) * backgroundImage.naturalWidth;
        ctx.drawImage(
          backgroundImage,
          0,
          sourceY,
          wrapSourceWidth,
          sourceHeight,
          destWidth,
          0,
          remainingWidth,
          destHeight
        );
      }

      // Handle vertical wrapping (bottom edge)
      if (destHeight < canvas.height) {
        const remainingHeight = canvas.height - destHeight;
        const wrapSourceHeight =
          (remainingHeight / drawHeight) * backgroundImage.naturalHeight;
        const wrapSourceY = 0;

        // Draw bottom portion (main horizontal strip)
        ctx.drawImage(
          backgroundImage,
          sourceX,
          wrapSourceY,
          sourceWidth,
          wrapSourceHeight,
          0,
          destHeight,
          destWidth,
          remainingHeight
        );

        // Draw bottom-right corner if both wrap
        if (destWidth < canvas.width) {
          const remainingWidth = canvas.width - destWidth;
          const wrapSourceWidth =
            (remainingWidth / scaledWidth) * backgroundImage.naturalWidth;
          ctx.drawImage(
            backgroundImage,
            0,
            wrapSourceY,
            wrapSourceWidth,
            wrapSourceHeight,
            destWidth,
            destHeight,
            remainingWidth,
            remainingHeight
          );
        }
      }
    }
  } else {
    // Fallback: Sky gradient if image not loaded yet
    const avgSlopeY = (getGroundY(0) + getGroundY(canvas.width)) / 2;
    const gradient = ctx.createLinearGradient(0, 0, 0, avgSlopeY);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw snowflakes
  ctx.fillStyle = "#FFFFFF";
  snowflakes.forEach((flake) => {
    const avgSlopeY = (getGroundY(0) + getGroundY(canvas.width)) / 2;
    // Only draw snowflakes above the slope
    if (flake.y < avgSlopeY) {
      ctx.globalAlpha = flake.opacity;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  });
}

// Game loop
function gameLoop() {
  // Only draw/update if game container is visible
  if (!gameContainer.classList.contains("hidden")) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Only draw/update if game is running
    if (gameState.running) {
      // Update
      updatePlayer();
      updateObstacles();
      updateSnowflakes();

      // Draw
      drawBackground();
      drawSlope();
      drawLiftCable();
      drawLiftCars();
      drawObstacles();
      drawFinishLine();
      drawPlayer();
      drawHearts();
    } else {
      // Draw final frame
      drawBackground();
      drawSlope();
      drawLiftCable();
      drawLiftCars();
      drawObstacles();
      drawFinishLine();
      drawPlayer();
      drawHearts();

      if (!gameState.finishLineReached && !gameState.rewardScreenShown) {
        // Game over (collision)
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FF0000";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        // Display stored game over message
        if (gameState.gameOverMessage) {
          ctx.fillText(
            gameState.gameOverMessage,
            canvas.width / 2,
            canvas.height / 2
          );
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "14px Arial";
        ctx.fillText(
          "Kliknutím reštartuješ",
          canvas.width / 2,
          canvas.height / 2 + 40
        );
      }
    }

    // Draw start message on canvas if needed
    if (startMessageState.show) {
      const currentTime = Date.now();
      const elapsed = currentTime - startMessageState.startTime;

      // Calculate opacity
      let opacity = 1.0;
      if (currentTime >= startMessageState.fadeStartTime) {
        const fadeElapsed = currentTime - startMessageState.fadeStartTime;
        opacity = Math.max(
          0,
          1.0 - fadeElapsed / startMessageState.fadeDuration
        );
      }

      // Hide message after fade completes
      if (opacity <= 0) {
        startMessageState.show = false;
      } else {
        const midY = canvas.height / 2;

        // Draw semi-transparent rectangles highlighting clickable areas
        ctx.save();
        ctx.globalAlpha = opacity * 0.6; // Less transparent

        // Top half - jump area (red-ish color)
        ctx.fillStyle = "#CC0000";
        ctx.fillRect(0, 0, canvas.width, midY);

        // Bottom half - crouch area (black-ish color)
        ctx.fillStyle = "#333333";
        ctx.fillRect(0, midY, canvas.width, midY);

        ctx.restore();

        // Draw the message split into 2 lines
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 38px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Add text shadow effect
        ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 3;
        ctx.shadowOffsetY = 3;

        // First line: "Klikni hore = skok"
        ctx.fillText(
          "Klikni hore = skok",
          canvas.width / 2,
          canvas.height / 2 - 70
        );

        // Second line: "Klikni dole = drep 💋"
        ctx.fillText(
          "Klikni dole = drep 💋",
          canvas.width / 2,
          canvas.height / 2 + 70
        );

        ctx.restore();
      }
    }
  }

  // Always continue the loop (even when game is not running)
  requestAnimationFrame(gameLoop);
}

// Restart game
function restartGame() {
  gameState.running = true;
  gameState.score = 0;
  gameState.obstaclesPassed = 0;
  gameState.finishLineReached = false;
  gameState.gameOverMessage = null;
  gameState.rewardScreenShown = false;
  gameState.health = 3; // Reset health to 3
  const groundOffset = 64; // Same offset as in updatePlayer (increased by 20px)
  player.height = player.normalHeight; // Reset to normal height
  player.groundY = getGroundY(player.x) - player.height + groundOffset;
  player.y = player.groundY;
  player.velocityY = 0;
  player.isJumping = false;
  player.isCrouching = false; // Reset crouching state
  player.hitAnimation.active = false; // Reset hit animation
  gameScroll = 0;
  backgroundScroll = 0;
  backgroundScrollY = 0;
  obstacleCountElement.textContent = "0";
  gameOverElement.classList.add("hidden");
  rewardScreenElement.classList.add("hidden");
  rotationInstructionScreen.classList.add("hidden");
  rewardVideo.classList.add("hidden");
  rewardVideo.pause();
  rewardVideo.currentTime = 0;
  initLiftCars(); // Must be called before initObstacles() to prevent overlap
  initObstacles();
  // Show start message again
  showStartMessage();
}

// Allow restart on click/tap after game over
canvas.addEventListener("click", () => {
  if (
    !gameState.running &&
    !gameState.finishLineReached &&
    !gameState.rewardScreenShown
  ) {
    restartGame();
  }
});

canvas.addEventListener("touchstart", (e) => {
  if (
    !gameState.running &&
    !gameState.finishLineReached &&
    !gameState.rewardScreenShown
  ) {
    e.preventDefault();
    restartGame();
  }
});

// Reward button click handler
rewardButton.addEventListener("click", () => {
  rewardScreenElement.classList.add("hidden");
  rotationInstructionScreen.classList.remove("hidden");
});

// Rotation instruction button click handler
rotationInstructionButton.addEventListener("click", async () => {
  rotationInstructionScreen.classList.add("hidden");
  rewardVideo.classList.remove("hidden");

  // Request fullscreen
  try {
    if (rewardVideo.requestFullscreen) {
      await rewardVideo.requestFullscreen();
    } else if (rewardVideo.webkitRequestFullscreen) {
      await rewardVideo.webkitRequestFullscreen();
    } else if (rewardVideo.mozRequestFullScreen) {
      await rewardVideo.mozRequestFullScreen();
    } else if (rewardVideo.msRequestFullscreen) {
      await rewardVideo.msRequestFullscreen();
    }
  } catch (error) {
    console.log("Fullscreen not available:", error);
  }

  rewardVideo.play();
});

// When video ends, hide it and exit fullscreen
rewardVideo.addEventListener("ended", () => {
  rewardVideo.classList.add("hidden");

  // Exit fullscreen
  try {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  } catch (error) {
    console.log("Exit fullscreen error:", error);
  }
});

// Function to show start message animation
function showStartMessage() {
  startMessageState.show = true;
  startMessageState.startTime = Date.now();
  startMessageState.fadeStartTime =
    startMessageState.startTime + startMessageState.duration;
}

// Function to start the game
function startGame() {
  // Hide menu and rotation warning, then show game container
  menuScreen.classList.add("hidden");
  rotationWarningScreen.classList.add("hidden");
  gameContainer.classList.remove("hidden");
  // Hide the sneak-peek image when game starts
  if (sneakPeekImage) {
    sneakPeekImage.style.display = "none";
  }

  // Resize canvas now that it's visible
  setTimeout(() => {
    resizeCanvas();

    // Initialize game
    initLiftCars(); // Must be called before initObstacles() to prevent overlap
    initObstacles();
    initSnowflakes();

    // Start the game
    gameState.running = true;

    // Show start message animation
    showStartMessage();
  }, 100);
}

// Track if game loop is running
let gameLoopRunning = false;

// Start game button click handler (shows rotation warning first)
startGameButton.addEventListener("click", () => {
  menuScreen.classList.add("hidden");
  rotationWarningScreen.classList.remove("hidden");
});

// Rotation confirmation button click handler (starts the game)
rotationConfirmButton.addEventListener("click", startGame);

// Initialize and start game loop (but game won't run until button is clicked)
gameLoop();
