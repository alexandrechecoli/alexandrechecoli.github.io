//Código para que a animação fique na pagina inteira!
let canvas;
function nao_apagar()
{
  canvas.position(0,0);
  canvas.style('z-index','-1');
}

function windowResized()
{
  //resizeCanvas(windowWidth, windowHeight + 250);
  resizeCanvas(windowWidth, windowHeight );
}


// this class describes the properties of a single particle.
class Particle {
  // setting the co-ordinates, radius and the
  // speed of a particle in both the co-ordinates axes.
    constructor(){
      this.x = random(0,width);
      this.y = random(0,height);
      this.r = random(1,8);
      this.xSpeed = random(-2,2);
      this.ySpeed = random(-1,1.5);
    }
  
  // creation of a particle.
    createParticle() {
      noStroke();
      fill('rgba(96,89,212,0.4)');
      //fill('blue');
      circle(this.x,this.y,this.r);
    }
  
  // setting the particle in motion.
    moveParticle() {
      if(this.x < 0 || this.x > width)
        this.xSpeed*=-1;
      if(this.y < 0 || this.y > height)
        this.ySpeed*=-1;
      this.x+=this.xSpeed;
      this.y+=this.ySpeed;
    }
  
  // this function creates the connections(lines)
  // between particles which are less than a certain distance apart
    joinParticles(particles) {
      particles.forEach(element =>{
        let dis = dist(this.x,this.y,element.x,element.y);
        if(dis<85) {
          //stroke('rgba(200,169,169,0.3)');
          stroke('rgba(96,89,212,0.2)');
          line(this.x,this.y,element.x,element.y);
        }
      });
    }
  }
  
  // an array to add multiple particles
  let particles = [];
  
  function setup() {
    canvas = createCanvas(windowWidth, windowHeight );
    for(let i = 0;i<width/10;i++){
      particles.push(new Particle());
    }
    nao_apagar();
  }
  
  function draw() {
    //background('#0f0f0f');
    background(500);
    for(let i = 0;i<particles.length;i++) {
      particles[i].createParticle();
      particles[i].moveParticle();
      particles[i].joinParticles(particles.slice(i));
    }
  }


