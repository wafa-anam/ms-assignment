"use strict";

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;

      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }
    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
      
    }
    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(row, col) {
      console.log("uncover", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0){
        this.sprinkleMines(row, col);
        startTimer();
      }
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }
    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }
    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s += "M";
          else if( a.state === STATE_HIDDEN) s += "H";
          else if( a.state === STATE_MARKED) s += "F";
          else if( a.mine) s += "M";
          else s += a.count.toString();
        }
        res[row] = s;
      }    
      return res;
    }
    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
  }

  return _MSGame;

})();

function render(game) {
  const status = game.getStatus();
  const render = game.getRendering();

  const overlay = document.querySelector("#overlay")
  const overlayin = document.querySelector("#overlayin")
  if(status.done && !status.exploded) {
    document.querySelector("#end-message").innerHTML = "You Won! :)";
    overlayin.style.color = "black";
    overlayin.style.backgroundColor = "rgba(245, 191, 206, 0.8)";
    overlay.classList.add("active");
    stopTimer();
  }
  else if(status.done && status.exploded) {
    document.querySelector("#end-message").innerHTML = "You Lost :(";
    overlay.classList.add("active");
    overlayin.style.color = "white";
    overlayin.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    stopTimer();
  }
  renderGrid(render, status.ncols);
  
  document.querySelectorAll(".mineCount").forEach(
    (e)=> {
      e.textContent = String(status.nmines - status.nmarked);
    });
}

function renderGrid(render, cols){
  const grid = document.querySelector(".grid");
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  for( let i = 0 ; i < grid.children.length ; i ++) {
    const card = grid.children[i];
    const ind = Number(card.getAttribute("data-cardInd"));
    const col = ind % cols;
    const row = Math.floor(ind / cols);
    const stat = render[row].charAt(col);
    if(parseInt(stat) == 0){
      card.classList.remove("hidden");
      card.classList.remove("flag");
    }
    else if(parseInt(stat) > 0 && parseInt(stat) <= 8){
      card.classList.remove("hidden");
      card.classList.remove("flag")
      card.classList.add("no" + stat);
    }
    else {
      switch(stat) {
        case 'H':
          card.classList.add("hidden")
          card.classList.remove("flag")
          card.classList.remove("mine")
          break;
        case 'M':
          card.classList.add("mine")
          card.classList.remove("hidden")
          card.classList.remove("flag")
          break;
        case 'F':
          card.classList.add("flag")
          card.classList.remove("hidden")
          card.classList.remove("mine")
          break;
        default:
      }
    }
  }
}

function prepare_dom(game) {
  const status = game.getStatus();
  const grid = document.querySelector(".grid");
  const nCards = status.nrows * status.ncols;
  grid.querySelectorAll('*').forEach(n => n.remove());
  for( let i = 0 ; i < nCards ; i ++) {
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute("data-cardInd", i);
    const col = i % status.ncols;
    const row = Math.floor(i / status.ncols);
    card.addEventListener("click", () => {
      game.uncover(row, col);
      render(game);
    });
    card.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      game.mark(row, col);
      render(game);
    });
    grid.appendChild(card);
  }

  $(document).on("taphold", "card", function(e){
    e.preventDefault();
    const ind = $(e.target)[0].getAttribute("data-cardInd");
    const column = ind % status.ncols;
    const row = Math.floor(ind / status.ncols);
    game.mark(row, column);
    render(game);
    game.mark();
  })
}



function button_cb(size, game) {
  stopTimer();
  resetTime();
  if(size == "easy"){
    game.init(8, 10, 10);
  } else{
    game.init(14, 18, 40);
  }
  prepare_dom(game);
  render(game);
}

document.querySelector("#overlay").addEventListener("click", () => {
  document.querySelector("#overlay").classList.remove("active");
  resetTime();
  game.init(8, 10, 10);
  prepare_dom(game);
  render(game);
});

let game = new MSGame();
game.init(8, 10, 10);
prepare_dom(game);
render(game);

document.querySelectorAll(".menuButton").forEach((button) =>{
  const size = button.getAttribute("level");
  button.innerHTML = size;
  button.addEventListener("click", button_cb.bind(null, size, game));
});



    var currentTime = 0,
        interval = 0,
        lastUpdateTime = new Date().getTime(),
        secs = document.querySelectorAll('span.seconds');
    function pad(n){
        return('000' + n).substr(-3);
    }
    function update(){
        var now = new Date().getTime(),
            dt = now - lastUpdateTime;
        currentTime = currentTime + dt;
        var time = new Date(currentTime);
        secs.forEach(s => {
          s.innerHTML = pad(time.getSeconds() + time.getMinutes() * 60);
        })
        lastUpdateTime = now;
    }
    function startTimer(){
        if(!interval){
            lastUpdateTime = new Date().getTime();
            interval = setInterval(update,1);
        }
    }
    function resetTime(){
      secs.forEach(s => {
        s.innerHTML = "000";
      })
      currentTime = 0,
      interval = 0,
      lastUpdateTime = new Date().getTime()
    }
    function stopTimer(){
      clearInterval(interval);
      interval = 0;
    }