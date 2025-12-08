const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const obstacleCountElement = document.getElementById("obstacleCount");
const gameOverElement = document.getElementById("gameOver");
const rewardScreenElement = document.getElementById("rewardScreen");
const rewardButton = document.getElementById("rewardButton");
const rewardVideo = document.getElementById("rewardVideo");
const instructionsElement = document.querySelector(".instructions");
const menuScreen = document.getElementById("menuScreen");
const startGameButton = document.getElementById("startGameButton");
const gameContainer = document.querySelector(".game-container");

// Force landscape orientation on mobile devices
function checkOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile && isPortrait) {
    document.body.classList.add("force-landscape");
  } else {
    document.body.classList.remove("force-landscape");
  }

  // Resize canvas after orientation change
  setTimeout(() => {
    resizeCanvas();
    if (gameState.running) {
      initSnowflakes();
    }
  }, 100);
}

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
    checkOrientation();
  });
} else {
  resizeCanvas();
  checkOrientation();
}

// Listen for orientation and resize changes
window.addEventListener("resize", () => {
  checkOrientation();
  resizeCanvas();
  if (gameState.running) {
    initSnowflakes(); // Reinitialize snowflakes on resize
  }
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    checkOrientation();
    resizeCanvas();
    if (gameState.running) {
      initSnowflakes();
    }
  }, 100);
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
  velocityY: 0,
  isJumping: false,
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
const playerScreamingImage = new Image();
let imagesLoaded = 0;
const totalImages = 4; // Updated to include background image and screaming image

// Load character images
playerImage.src = "lucka_on_snowboard.png";
playerJumpImage.src = "lucka_jump.png";
playerScreamingImage.src = "lucka_on_sb_screaming.png";

// Background image
const backgroundImage = new Image();
backgroundImage.src = "tatry3.jpg";

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
  "obstacles/iphone.png",
  "obstacles/ja_shelby.png",
  "obstacles/ja.png",
  "obstacles/three-trees.png",
  "obstacles/tree.png",
  "obstacles/tree2.png",
];

// Load all obstacle images
obstacleImageFiles.forEach((src) => {
  const img = new Image();
  img.src = src;
  obstacleImages.push(img);
});

// Function to calculate ground Y at a given X position
function getGroundY(x) {
  return SLOPE_START_Y + x * SLOPE_ANGLE;
}

// Obstacles array
const obstacles = [];
const finishLine = {
  x: null,
  y: 0,
  width: 20,
  height: canvas.height,
  passed: false,
};

// Game settings
const OBSTACLE_COUNT = 1;
const OBSTACLE_SPACING = 400;
const SCROLL_SPEED = 3;
let gameScroll = 0;
const BACKGROUND_SCROLL_SPEED = 0.27; // Background moves slower than obstacles for parallax effect (reduced for longer game)
const BACKGROUND_SCROLL_SPEED_Y = 0.135; // Vertical scroll speed (downward) (reduced for longer game)
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

// Initialize obstacles
function initObstacles() {
  obstacles.length = 0;
  for (let i = 0; i < OBSTACLE_COUNT; i++) {
    const obstacleX = 1500 + i * OBSTACLE_SPACING;
    // Randomly select an obstacle image
    const randomImageIndex = Math.floor(Math.random() * obstacleImages.length);
    const selectedImage = obstacleImages[randomImageIndex];

    obstacles.push({
      x: obstacleX,
      y: getGroundY(obstacleX) - 80, // Position on slope (bottom edge on ground)
      width: 60, // 2x larger (was 30)
      height: 120, // 2x larger (was 60)
      passed: false,
      hit: false, // Track if this obstacle has already caused damage
      image: selectedImage, // Store reference to the image
      imageIndex: randomImageIndex, // Store index for reference
    });
  }
  // Set finish line after last obstacle
  finishLine.x = obstacles[OBSTACLE_COUNT - 1].x + OBSTACLE_SPACING;
  finishLine.passed = false;
}

// Jump function
function jump() {
  if (!player.isJumping && gameState.running) {
    player.velocityY = player.jumpPower;
    player.isJumping = true;
  }
}

// Event listeners for jump
canvas.addEventListener("click", jump);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  jump();
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

  obstacles.forEach((obstacle, index) => {
    obstacle.x -= SCROLL_SPEED;

    // Update obstacle Y position to follow the slope
    obstacle.y = getGroundY(obstacle.x) - 80; // Bottom edge on ground

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
      if (
        gameState.obstaclesPassed === OBSTACLE_COUNT &&
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
  // Calculate slope endpoints
  const leftY = getGroundY(0);
  const rightY = getGroundY(canvas.width);

  // Draw snow slope (tilted)
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(0, leftY);
  ctx.lineTo(canvas.width, rightY);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Draw slope line (tilted)
  ctx.strokeStyle = "#E0E0E0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, leftY);
  ctx.lineTo(canvas.width, rightY);
  ctx.stroke();

  // Add some texture lines to show the slope better
  ctx.strokeStyle = "#F0F0F0";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    const x = (canvas.width / 5) * i;
    const y1 = getGroundY(x);
    const y2 = getGroundY(x + 20);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x + 20, y2);
    ctx.stroke();
  }
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
    // Use the appropriate image based on jump state
    imageToUse = player.isJumping ? playerJumpImage : playerImage;
  }

  // Only draw if image is loaded
  if (imageToUse.complete && imageToUse.naturalWidth > 0) {
    ctx.drawImage(imageToUse, drawX, drawY, drawWidth, drawHeight);
  } else {
    // Fallback: draw a simple rectangle if image not loaded yet
    ctx.fillStyle = player.color;
    ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
  }
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
  const startX = canvas.width - (heartSize * 3 + spacing * 2) - 20; // Lower right corner with padding
  const startY = canvas.height - heartSize - 20; // Lower right corner with padding

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
      drawObstacles();
      drawFinishLine();
      drawPlayer();
      drawHearts();
    } else {
      // Draw final frame
      drawBackground();
      drawSlope();
      drawObstacles();
      drawFinishLine();
      drawPlayer();
      drawHearts();

      if (!gameState.finishLineReached) {
        // Game over (collision)
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FF0000";
        ctx.font = "bold 22px Arial";
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
        ctx.font = "18px Arial";
        ctx.fillText(
          "Kliknutím reštartuješ",
          canvas.width / 2,
          canvas.height / 2 + 40
        );
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
  player.groundY = getGroundY(player.x) - player.height + groundOffset;
  player.y = player.groundY;
  player.velocityY = 0;
  player.isJumping = false;
  player.hitAnimation.active = false; // Reset hit animation
  gameScroll = 0;
  backgroundScroll = 0;
  backgroundScrollY = 0;
  obstacleCountElement.textContent = "0";
  gameOverElement.classList.add("hidden");
  rewardScreenElement.classList.add("hidden");
  rewardVideo.classList.add("hidden");
  rewardVideo.pause();
  rewardVideo.currentTime = 0;
  initObstacles();
  // Show start message again
  showStartMessage();
}

// Allow restart on click/tap after game over
canvas.addEventListener("click", () => {
  if (!gameState.running && !gameState.finishLineReached) {
    restartGame();
  }
});

canvas.addEventListener("touchstart", (e) => {
  if (!gameState.running && !gameState.finishLineReached) {
    e.preventDefault();
    restartGame();
  }
});

// Reward button click handler
rewardButton.addEventListener("click", async () => {
  rewardScreenElement.classList.add("hidden");
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
  if (instructionsElement) {
    // Remove any existing classes first
    instructionsElement.classList.remove("start-message", "fade-out");
    // Force reflow to ensure the removal is processed
    void instructionsElement.offsetWidth;
    // Add start message class
    instructionsElement.classList.add("start-message");
    setTimeout(() => {
      instructionsElement.classList.add("fade-out");
      setTimeout(() => {
        instructionsElement.classList.remove("start-message", "fade-out");
      }, 500); // Remove classes after fade animation completes
    }, 1500); // Start fade after 1.5 seconds
  }
}

// Function to start the game
function startGame() {
  // Hide menu and show game container
  menuScreen.classList.add("hidden");
  gameContainer.classList.remove("hidden");

  // Resize canvas now that it's visible
  setTimeout(() => {
    resizeCanvas();

    // Initialize game
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

// Start game button click handler
startGameButton.addEventListener("click", startGame);

// Initialize and start game loop (but game won't run until button is clicked)
gameLoop();
