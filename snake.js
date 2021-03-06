// The function gets called when the window is fully loaded
var audioBg = new Audio("assets/sound/bg.mp3")
window.onload = function () {
  let tryAgainLink = $(".tryAgain").attr("href")
  $(".tryAgain").attr("href", tryAgainLink + "?c=" + randRange(10000, 99999))
  // Get the canvas and context
  var canvas = document.getElementById("viewport")

  var context = canvas.getContext("2d")

  var addSpeed = 0
  // Timing and frames per second
  var lastframe = 0
  var fpstime = 0
  var framecount = 0
  var fps = 0

  var initialized = false

  let isMove = false
  // Images
  var images = []
  var tileimage

  // Image loading global variables
  var loadcount = 0
  var loadtotal = 0
  var preloaded = false

  // Load images
  function loadImages(imagefiles) {
    // Initialize variables
    loadcount = 0
    loadtotal = imagefiles.length
    preloaded = false

    // Load the images
    var loadedimages = []
    for (var i = 0; i < imagefiles.length; i++) {
      // Create the image object
      var image = new Image()

      // Add onload event handler
      image.onload = function () {
        loadcount++
        if (loadcount == loadtotal) {
          // Done loading
          preloaded = true
        }
      }

      // Set the source url of the image
      image.src = imagefiles[i]

      // Save to the image array
      loadedimages[i] = image
    }

    // Return an array of images
    return loadedimages
  }

  // Level properties
  var Level = function (columns, rows, tilewidth, tileheight) {
    this.columns = columns
    this.rows = rows
    this.tilewidth = tilewidth
    this.tileheight = tileheight

    // Initialize tiles array
    this.tiles = []
    for (var i = 0; i < this.columns; i++) {
      this.tiles[i] = []
      for (var j = 0; j < this.rows; j++) {
        this.tiles[i][j] = 0
      }
    }
  }

  // Generate a default level with walls
  Level.prototype.generate = function () {
    for (var i = 0; i < this.columns; i++) {
      for (var j = 0; j < this.rows; j++) {
        if (i == 0 || i == this.columns - 1 || j == 0 || j == this.rows - 1) {
          // Add walls at the edges of the level
          this.tiles[i][j] = 0
        } else {
          // Add empty space
          this.tiles[i][j] = 0
        }
      }
    }
  }

  // Snake
  var Snake = function () {
    this.init(0, 0, 1, 10, 1)
  }

  // Direction table: Up, Right, Down, Left
  Snake.prototype.directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]

  // Initialize the snake at a location
  Snake.prototype.init = function (x, y, direction, speed, numsegments) {
    this.x = x
    this.y = y
    this.direction = direction // Up, Right, Down, Left
    this.speed = speed // Movement speed in blocks per second
    this.movedelay = 0

    // Reset the segments and add new ones
    this.segments = []
    this.growsegments = 0
    for (var i = 0; i < numsegments; i++) {
      this.segments.push({
        x: this.x - i * this.directions[direction][0],
        y: this.y - i * this.directions[direction][1],
      })
    }
  }

  // Increase the segment count
  Snake.prototype.grow = function () {
    this.growsegments++
  }

  // Check we are allowed to move
  Snake.prototype.tryMove = function (dt) {
    this.movedelay += dt
    isMove = true
    var maxmovedelay = 1 / (this.speed + addSpeed)
    if (this.movedelay > maxmovedelay) {
      return true
    }
    return false
  }

  // Get the position of the next move
  Snake.prototype.nextMove = function () {
    var nextx = this.x + this.directions[this.direction][0]
    var nexty = this.y + this.directions[this.direction][1]
    return { x: nextx, y: nexty }
  }

  // Move the snake in the direction
  Snake.prototype.move = function () {
    // Get the next move and modify the position
    var nextmove = this.nextMove()
    this.x = nextmove.x
    this.y = nextmove.y

    // Get the position of the last segment
    var lastseg = this.segments[this.segments.length - 1]
    var growx = lastseg.x
    var growy = lastseg.y

    // Move segments to the position of the previous segment
    for (var i = this.segments.length - 1; i >= 1; i--) {
      this.segments[i].x = this.segments[i - 1].x
      this.segments[i].y = this.segments[i - 1].y
    }

    // Grow a segment if needed
    if (this.growsegments > 0) {
      this.segments.push({ x: growx, y: growy })
      this.growsegments--
    }

    // Move the first segment
    this.segments[0].x = this.x
    this.segments[0].y = this.y

    // Reset movedelay
    this.movedelay = 0
  }

  // Create objects
  var snake = new Snake()
  var level = new Level(20, 11, 64, 64)

  // Variables
  var score = 0 // Score
  var gameover = true // Game is over
  var gameovertime = 1 // How long we have been game over
  var gameoverdelay = 0.5 // Waiting time after game over

  // Initialize the game
  function init() {
    // Load images
    images = loadImages(["snake-graphics.png"])
    tileimage = images[0]

    // Add mouse events
    canvas.addEventListener("mousedown", onMouseDown)

    // Add keyboard events
    document.addEventListener("keydown", onKeyDown)

    // New game
    newGame()
    gameover = true

    // Enter main loop
    main(0)
  }

  // Check if we can start a new game
  function tryNewGame() {
    if (gameovertime > gameoverdelay) {
      newGame()
      audioBg.play()
      gameover = false
    }
  }

  function newGame() {
    // Initialize the snake
    snake.init(10, 3, 1, 5, 4)

    // Generate the default level
    level.generate()

    // Add Item
    addItem()
    addItem()
    addItem()
    addWall()

    // Initialize the score
    score = 0
    $(".snake-score").text(score)

    // Initialize variables
    gameover = false
  }

  function baseAddItem(position, cx = false, cy = false) {
    // Loop until we have a valid item
    var valid = false
    while (!valid) {
      // Get a random position
      var ax = cx || randRange(0, level.columns - 1)
      var ay = cy || randRange(0, level.rows - 1)

      // Make sure the snake doesn't overlap the new apple
      var overlap = false
      for (var i = 0; i < snake.segments.length; i++) {
        // Get the position of the current snake segment
        var sx = snake.segments[i].x
        var sy = snake.segments[i].y

        // Check overlap
        if (ax == sx && ay == sy) {
          overlap = true
          break
        }
      }

      // Tile must be empty
      if (!overlap && level.tiles[ax][ay] == 0) {
        // Add an item at the tile position
        level.tiles[ax][ay] = position

        valid = true
      }
    }
  }
  // Add an apple to the level at an empty position
  function addItem() {
    baseAddItem(randomInteger(2, 9))
  }

  // Add an item to the level at an empty position
  function addWall() {
    baseAddItem(10, 3, 5)
    baseAddItem(10, 8, 4)
    baseAddItem(10, 13, 4)
    baseAddItem(10, 11, 8)
  }

  // Main loop
  function main(tframe) {
    // Request animation frames
    window.requestAnimationFrame(main)

    if (!initialized) {
      // Preloader

      // Clear the canvas
      context.clearRect(0, 0, canvas.width, canvas.height)

      // Draw a progress bar
      var loadpercentage = loadcount / loadtotal
      context.strokeStyle = "#ff8080"
      context.lineWidth = 3
      context.strokeRect(18.5, 0.5 + canvas.height - 51, canvas.width - 37, 32)
      context.fillStyle = "#ff8080"
      context.fillRect(18.5, 0.5 + canvas.height - 51, loadpercentage * (canvas.width - 37), 32)

      // Draw the progress text
      var loadtext = "Loaded " + loadcount + "/" + loadtotal + " images"
      context.fillStyle = "#000000"
      context.font = "16px Verdana"
      context.fillText(loadtext, 18, 0.5 + canvas.height - 63)

      if (preloaded) {
        initialized = true
      }
    } else {
      // Update and render the game
      update(tframe)
      render()
    }
  }

  // Update the game state
  function update(tframe) {
    var dt = (tframe - lastframe) / 1000
    lastframe = tframe

    // Update the fps counter
    updateFps(dt)

    if (!gameover) {
      updateGame(dt)
    } else {
      gameovertime += dt
    }
  }

  let zIndex = 1
  function addFactory(n) {
    let randClass = `f-${randRange(1, 100)}`
    $(".addFactory").append(
      `<img src="assets/img/${n}.png" class="${randClass} abs" style="z-index:${zIndex}">`
    )

    setTimeout(function () {
      $("." + randClass).fadeOut("slow")
    }, 1000)
    zIndex++
  }
  function updateGame(dt) {
    // Move the snake
    if (snake.tryMove(dt)) {
      // Check snake collisions

      // Get the coordinates of the next move
      var nextmove = snake.nextMove()
      var nx = nextmove.x
      var ny = nextmove.y

      if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
        if (level.tiles[nx][ny] == 1 || level.tiles[nx][ny] == 10) {
          // Collision with a wall
          gameover = true
        }

        // Collisions with the snake itself
        for (var i = 0; i < snake.segments.length; i++) {
          var sx = snake.segments[i].x
          var sy = snake.segments[i].y

          if (nx == sx && ny == sy) {
            // Found a snake part
            gameover = true
            break
          }
        }

        if (!gameover) {
          // The snake is allowed to move

          // Move the snake
          snake.move()

          // Check collision with an item
          if (level.tiles[nx][ny] >= 2) {
            let posItem = level.tiles[nx][ny]
            // Remove the item
            level.tiles[nx][ny] = 0

            // Add a new item

            // Grow the snake
            snake.grow()

            // Add a point to the score

            if (posItem >= 2 && posItem <= 5) {
              score += 10
              $(".score-p-10").fadeIn()
              setTimeout(function () {
                $(".score-p-10").toggle("slide")
              }, 500)
            } else if (posItem >= 6 && posItem <= 7) {
              score += 5
              $(".score-p-5").fadeIn()
              setTimeout(function () {
                $(".score-p-5").toggle("slide")
              }, 500)
            } else if (posItem >= 8 && posItem <= 9) {
              score -= 5
              $(".score-m-5").fadeIn()
              setTimeout(function () {
                $(".score-m-5").toggle("slide")
              }, 500)
            }

            switch (posItem) {
              case 2:
                addFactory("a")
                break
              case 3:
                addFactory("b")
                break
              case 4:
                addFactory("c")
                break
              case 5:
                addFactory("d")
                break
              case 6:
                addFactory("f")
                break
              case 7:
                addFactory("e")
                break
              case 8:
                addFactory("g")
                break
              case 9:
                addFactory("h")
                break
            }
          }
        }
      } else {
        // Out of bounds
        gameover = true
      }

      if (gameover) {
        gameovertime = 0
      }

      $(".snake-score").text(score)
    }
  }

  function updateFps(dt) {
    if (fpstime > 0.25) {
      // Calculate fps
      fps = Math.round(framecount / fpstime)

      // Reset time and framecount
      fpstime = 0
      framecount = 0
    }

    // Increase time and framecount
    fpstime += dt
    framecount++
  }

  var countTime = 3
  var calledTime = false
  var okPlay = false
  // Render the game
  function render() {
    // Draw background
    // context.fillStyle = "#577ddb"
    context.fillRect(0, 0, canvas.width, canvas.height)

    drawLevel()
    drawSnake()

    // Game over
    if (gameover) {
      if (isMove) {
        $(".gameover-show").show()
        $(".total-snake-score .score-gameover").text(score)
      }
      if (!calledTime) {
        drawCountScene()
        calledTime = true
      }
    }
  }

  function drawCountSceneOld() {
    context.fillStyle = "rgba(0, 0, 0, 0.5)"
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = "#ffffff"
    context.font = "11rem PslFont"

    drawCenterText(`${countTime}`, 0, canvas.height / 2, canvas.width)
    countTime--
  }

  function drawCountScene() {
    if (countTime > 0) {
      $(".fullcount").text(countTime)

      var cs = setTimeout(function () {
        drawCountScene()
        countTime--
      }, 1000)
    } else {
      $(".fullcount").hide()
      clearTimeout(cs)
      okPlay = true
      onKeyDown({ keyCode: 39 })
    }
  }

  let isDrawBgSuccess = false
  // Draw the level tiles
  function drawLevel() {
    for (var i = 0; i < level.columns; i++) {
      for (var j = 0; j < level.rows; j++) {
        // Get the current tile and location
        var tile = level.tiles[i][j]
        var tilex = i * level.tilewidth
        var tiley = j * level.tileheight

        // Draw tiles based on their type
        if (tile != 1) {
          // Draw item background
          if (!isDrawBgSuccess) {
            if (i % 2 == 0) {
              if (j % 2 == 0) {
                context.fillStyle = "#6fb43c"
                // context.fillStyle = "#333333"
              } else {
                context.fillStyle = "#92c13a"
                // context.fillStyle = "#000000"
              }
            } else {
              if (j % 2 == 0) {
                context.fillStyle = "#92c13a"
                // context.fillStyle = "#000000"
              } else {
                context.fillStyle = "#6fb43c"
                // context.fillStyle = "#333333"
              }
            }
            // context.fillStyle = "#6fb43c"
            context.fillRect(tilex, tiley, level.tilewidth, level.tileheight)
            // Empty space
          }
        }

        if (tile == 1) {
          // Wall
          context.fillStyle = "#407a09"
          context.fillRect(tilex, tiley, level.tilewidth, level.tileheight)
        } else if (tile == 2) {
          // Apple
          // Draw the apple image
          var tx = 0
          var ty = 3
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 3) {
          // Draw the item image
          var tx = 0
          var ty = 4
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 4) {
          // Draw the item image
          var tx = 0
          var ty = 5
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 5) {
          // Draw the item image
          var tx = 0
          var ty = 6
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 6) {
          // Draw the item image
          var tx = 1
          var ty = 3
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 7) {
          // Draw the item image
          var tx = 1
          var ty = 4
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 8) {
          // Draw the item image
          var tx = 1
          var ty = 5
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 9) {
          // Draw the item image
          var tx = 1
          var ty = 6
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        } else if (tile == 10) {
          // Draw the item image
          var tx = 2
          var ty = 6
          var tilew = 64
          var tileh = 64
          context.drawImage(
            tileimage,
            tx * tilew,
            ty * tileh,
            tilew,
            tileh,
            tilex,
            tiley,
            level.tilewidth,
            level.tileheight
          )
        }
      }
    }
  }

  function randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // Draw the snake
  function drawSnake() {
    // Loop over every snake segment
    for (var i = 0; i < snake.segments.length; i++) {
      var segment = snake.segments[i]
      var segx = segment.x
      var segy = segment.y
      var tilex = segx * level.tilewidth
      var tiley = segy * level.tileheight

      // Sprite column and row that gets calculated
      var tx = 0
      var ty = 0

      if (i == 0) {
        // Head; Determine the correct image
        var nseg = snake.segments[i + 1] // Next segment
        if (segy < nseg.y) {
          // Up
          tx = 3
          ty = 0
        } else if (segx > nseg.x) {
          // Right
          tx = 4
          ty = 0
        } else if (segy > nseg.y) {
          // Down
          tx = 4
          ty = 1
        } else if (segx < nseg.x) {
          // Left
          tx = 3
          ty = 1
        }
      } else if (i == snake.segments.length - 1) {
        // Tail; Determine the correct image
        var pseg = snake.segments[i - 1] // Prev segment
        if (pseg.y < segy) {
          // Up
          tx = 3
          ty = 2
        } else if (pseg.x > segx) {
          // Right
          tx = 4
          ty = 2
        } else if (pseg.y > segy) {
          // Down
          tx = 4
          ty = 3
        } else if (pseg.x < segx) {
          // Left
          tx = 3
          ty = 3
        }
      } else {
        // Body; Determine the correct image
        var pseg = snake.segments[i - 1] // Previous segment
        var nseg = snake.segments[i + 1] // Next segment
        if ((pseg.x < segx && nseg.x > segx) || (nseg.x < segx && pseg.x > segx)) {
          // Horizontal Left-Right
          tx = 1
          ty = 0
        } else if ((pseg.x < segx && nseg.y > segy) || (nseg.x < segx && pseg.y > segy)) {
          // Angle Left-Down
          tx = 2
          ty = 0
        } else if ((pseg.y < segy && nseg.y > segy) || (nseg.y < segy && pseg.y > segy)) {
          // Vertical Up-Down
          tx = 2
          ty = 1
        } else if ((pseg.y < segy && nseg.x < segx) || (nseg.y < segy && pseg.x < segx)) {
          // Angle Top-Left
          tx = 2
          ty = 2
        } else if ((pseg.x > segx && nseg.y < segy) || (nseg.x > segx && pseg.y < segy)) {
          // Angle Right-Up
          tx = 0
          ty = 1
        } else if ((pseg.y > segy && nseg.x > segx) || (nseg.y > segy && pseg.x > segx)) {
          // Angle Down-Right
          tx = 0
          ty = 0
        }
      }

      // Draw the image of the snake part
      context.drawImage(
        tileimage,
        tx * 64,
        ty * 64,
        64,
        64,
        tilex,
        tiley,
        level.tilewidth,
        level.tileheight
      )
    }
  }

  // Draw text that is centered
  function drawCenterText(text, x, y, width) {
    var textdim = context.measureText(text)
    context.fillText(text, x + (width - textdim.width) / 2, y)
  }

  // Get a random int between low and high, inclusive
  function randRange(low, high) {
    return Math.floor(low + Math.random() * (high - low + 1))
  }

  // Mouse event handlers
  function onMouseDown(e) {
    // Get the mouse position
    var pos = getMousePos(canvas, e)

    if (gameover) {
      // Start a new game
      // location.reload()

      tryNewGame()
    } else {
      // Change the direction of the snake
      snake.direction = (snake.direction + 1) % snake.directions.length
    }
  }

  var timeResponse = 2300
  function responseItem() {
    if (!gameover) {
      var d = Math.random()

      var percenTrash = 0.3

      if (score >= 50 && score <= 100) {
        percenTrash = 0.45
        addSpeed = 2
      } else if (score > 100 && score <= 150) {
        percenTrash = 0.6
        addSpeed = 4
      } else if (score > 150) {
        percenTrash = 0.7
        addSpeed = 6
      }

      if (d < percenTrash) {
        addItem(randRange(8, 9))
      }
      // 50% chance of being here
      else {
        addItem()
      }
      // 20% chance of being here

      setTimeout(function () {
        responseItem()
      }, timeResponse)
    }
  }

  $(".joy-left").click(function () {
    if (snake.direction != 1) {
      snake.direction = 3
    }
  })

  $(".joy-top").click(function () {
    if (snake.direction != 2) {
      snake.direction = 0
    }
  })

  $(".joy-right").click(function () {
    if (snake.direction != 3) {
      snake.direction = 1
    }
  })

  $(".joy-down").click(function () {
    if (snake.direction != 0) {
      snake.direction = 2
    }
  })

  $(".joycon").click(function () {
    if (okPlay) {
      if (!isMove) {
        tryNewGame()
      }
      responseItem()
    }
  })

  // Keyboard event handler
  function onKeyDown(e) {
    if (gameover) {
      if (okPlay) {
        if (!isMove) {
          tryNewGame()
        }
        responseItem()
      }
    } else {
      if (e.keyCode == 37 || e.keyCode == 65) {
        // Left or A
        if (snake.direction != 1) {
          snake.direction = 3
        }
      } else if (e.keyCode == 38 || e.keyCode == 87) {
        // Up or W
        if (snake.direction != 2) {
          snake.direction = 0
        }
      } else if (e.keyCode == 39 || e.keyCode == 68) {
        // Right or D
        if (snake.direction != 3) {
          snake.direction = 1
        }
      } else if (e.keyCode == 40 || e.keyCode == 83) {
        // Down or S
        if (snake.direction != 0) {
          snake.direction = 2
        }
      }

      // Grow for demonstration purposes
      if (e.keyCode == 32) {
        snake.grow()
      }
    }
  }

  //   // Get the mouse position
  //   function getMousePos(canvas, e) {
  //     var rect = canvas.getBoundingClientRect()
  //     return {
  //       x: Math.round(((e.clientX - rect.left) / (rect.right - rect.left)) * canvas.width),
  //       y: Math.round(((e.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height),
  //     }
  //   }

  // Call init to start the game
  init()
}
