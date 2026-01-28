
var canvas;
var gl;

var program;

var near = 1;
var far = 100;


var left = -6.0;
var right = 6.0;
var ytop =6.0;
var bottom = -6.0;


var lightPosition2 = vec4(100.0, 100.0, 100.0, 1.0 );
var lightPosition = vec4(0.0, 0.0, 100.0, 1.0 );

var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 0.4, 0.4, 0.4, 1.0 );
var materialShininess = 30.0;

var ambientColor, diffuseColor, specularColor;

var modelMatrix, viewMatrix, modelViewMatrix, projectionMatrix, normalMatrix;
var modelViewMatrixLoc, projectionMatrixLoc, normalMatrixLoc;
var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

var RX = 0;
var RY = 0;
var RZ = 0;

var MS = []; // The modeling matrix stack
var TIME = 0.0; // Realtime
var dt = 0.0
var prevTime = 0.0;
var resetTimerFlag = true;
var animFlag = false;
var controller;

// These are used to store the current state of objects.
// In animation it is often useful to think of an object as having some DOF
// Then the animation is simply evolving those DOF over time.
var sphereRotation = [0,0,0];
var spherePosition = [0,0,0];

var cubeRotation = [0,0,0];
var cubePosition = [-1,0,0];

var cylinderRotation = [0,0,0];
var cylinderPosition = [1,0,0];

var coneRotation = [0,0,0];
var conePosition = [3,0,0];

var personPosition = [0,0,0];
var personFace = [0,0,0];

// Setting the colour which is needed during illumination of a surface
function setColor(c)
{
    ambientProduct = mult(lightAmbient, c);
    diffuseProduct = mult(lightDiffuse, c);
    specularProduct = mult(lightSpecular, materialSpecular);
    
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "specularProduct"),flatten(specularProduct) );
    gl.uniform4fv( gl.getUniformLocation(program,
                                         "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
                                        "shininess"),materialShininess );
}

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.5, 0.5, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    

    setColor(materialDiffuse);
	
	// Initialize some shapes, note that the curved ones are procedural which allows you to parameterize how nice they look
	// Those number will correspond to how many sides are used to "estimate" a curved surface. More = smoother
    Cube.init(program);
    Cylinder.init(50,program);
    Cone.init(50,program);
    Sphere.init(50,program);

    // Matrix uniforms
    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    
    // Lighting Uniforms
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );


    document.getElementById("animToggleButton").onclick = function() {
        if( animFlag ) {
            animFlag = false;
        }
        else {
            animFlag = true;
            resetTimerFlag = true;
            window.requestAnimFrame(render);
        }
        //console.log(animFlag);
		
		controller = new CameraController(canvas);
		controller.onchange = function(xRot,yRot) {
			RX = xRot;
			RY = yRot;
			window.requestAnimFrame(render); };
    };

    render(0);
}

// Sets the modelview and normal matrix in the shaders
function setMV() {
    modelViewMatrix = mult(viewMatrix,modelMatrix);
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix) );
    normalMatrix = inverseTranspose(modelViewMatrix);
    gl.uniformMatrix4fv(normalMatrixLoc, false, flatten(normalMatrix) );
}

// Sets the projection, modelview and normal matrix in the shaders
function setAllMatrices() {
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );
    setMV();   
}

// Draws a 2x2x2 cube center at the origin
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCube() {
    setMV();
    Cube.draw();
}

// Draws a sphere centered at the origin of radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawSphere() {
    setMV();
    Sphere.draw();
}

// Draws a cylinder along z of height 1 centered at the origin
// and radius 0.5.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCylinder() {
    setMV();
    Cylinder.draw();
}

// Draws a cone along z of height 1 centered at the origin
// and base radius 1.0.
// Sets the modelview matrix and the normal matrix of the global program
// Sets the attributes and calls draw arrays
function drawCone() {
    setMV();
    Cone.draw();
}

// Post multiples the modelview matrix with a translation matrix
// and replaces the modeling matrix with the result
function gTranslate(x,y,z) {
    modelMatrix = mult(modelMatrix,translate([x,y,z]));
}

// Post multiples the modelview matrix with a rotation matrix
// and replaces the modeling matrix with the result
function gRotate(theta,x,y,z) {
    modelMatrix = mult(modelMatrix,rotate(theta,[x,y,z]));
}

// Post multiples the modelview matrix with a scaling matrix
// and replaces the modeling matrix with the result
function gScale(sx,sy,sz) {
    modelMatrix = mult(modelMatrix,scale(sx,sy,sz));
}

// Pops MS and stores the result as the current modelMatrix
function gPop() {
    modelMatrix = MS.pop();
}

// pushes the current modelViewMatrix in the stack MS
function gPush() {
    MS.push(modelMatrix);
}

//Had to make a new variable that counted the time since timestamp() would make my objects got crazy
//Not sure if it was just a bug or what but I didn't want to change it since realTime worked fine

//bubbles
let numBubbles = 0;
let bubbles = [];

var realTime = 0;
function render(timestamp) {
	realTime+=dt;
    
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    eye = vec3(0,0,10);
    MS = []; // Initialize modeling matrix stack
	
	// initialize the modeling matrix to identity
    modelMatrix = mat4();
    
    // set the camera matrix
    viewMatrix = lookAt(eye, at , up);
   
    // set the projection matrix
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);
    
    
    // set all the matrices
    setAllMatrices();
    
	if( animFlag )
    {
		// dt is the change in time or delta time from the last frame to this one
		// in animation typically we have some property or degree of freedom we want to evolve over time
		// For example imagine x is the position of a thing.
		// To get the new position of a thing we do something called integration
		// the simpelst form of this looks like:
		// x_new = x + v*dt
		// That is the new position equals the current position + the rate of of change of that position (often a velocity or speed), times the change in time
		// We can do this with angles or positions, the whole x,y,z position or just one dimension. It is up to us!
		dt = (timestamp - prevTime) / 1000.0;
		prevTime = timestamp;
	}
	
	/////////////////////////////////////////////////////////
	///						GROUND 			              ///
	/////////////////////////////////////////////////////////
	var groundPosition = [0,-6,0];
	gPush();
		gTranslate(groundPosition[0],groundPosition[1],groundPosition[2])
			gPush();
				gScale(6,1,1);
			gPush();
			{
				setColor(vec4(0.1,0.1,0.1,1.0));
				drawCube();
			}
			gPop();
		gPop();
	gPop();
	
	/////////////////////////////////////////////////////////
	///						ROCKS			              ///
	/////////////////////////////////////////////////////////
	//Drawing Rocks
	var orginRockPosition = [0,0,0];
	gPush();
		gTranslate(groundPosition[0],groundPosition[1]+ 1.7,groundPosition[2])
		orginRockPosition = [groundPosition[0],groundPosition[1]+ 1.5,groundPosition[2]];
		gPush();
			gScale(0.7,0.7,0.7);
			gPush();
			{
				setColor(vec4(0.5,0.5,0.5,1.0));
				//draw orgin Rock
				drawSphere();
			}
			gPop();
		gPop();
		gPush();
			gTranslate(-1.1,-0.3,0);
			gPush();
				gScale(0.4, 0.4, 0.4);
				gPush();
				{
					setColor(vec4(0.5,0.5,0.5,1.0));
					//draw little other rock
					drawSphere();
				}
				gPop();
			gPop();
		gPop();
	gPop();
	

	/////////////////////////////////////////////////////////
	///						SEAWEED			              ///
	/////////////////////////////////////////////////////////
	
	let x = 0; //variable to tell which strand is being currently made
	var amplitude = 30;  // amplitude of the seaweed sway
	var frequency = 0.5; // frequency of the seaweed sawy
	
	gPush();
		gTranslate(orginRockPosition[0]-0.6, orginRockPosition[1]+0.8, orginRockPosition[1]+4);
		//the 1 2 and 3 for makeSeaweed() are used to tell which strand of seaweed i am referring to
		makeSeaweed(1)
		gTranslate(0.6,0,0)
		makeSeaweed(2);
		gTranslate(0.6,0,0)
		makeSeaweed(3);
	gPop();
	
	//funciton for drawing and animating each additional piece of seaweed
	function makeSeaweed(curLevel){
		gPush();
			setColor(vec4(0,1.0,0,1.0));
			gScale(0.15,0.4,0.2);
			//draws the first piece of seaweed
			drawSphere();
			//had to translate it down so that the next piece will be spawned in the proper spot
			gTranslate(0,-0.95,0)
			let height = 0;
			for(let i = 0; i < 9; i++){
				height+=1.9 //height represents how far apart in the y each seaweed is from the orgin piece of seaweed
				
				//chubbyRotate is a rotation that make each seaweed "jiggle" back and forth
				//I wanted to get it rotating in the other way (x-axis) but found out that my scale was messing with it.
				//0,1,2 represent the strand that I sent into the function, so that the strands appear different
				let chubbyRotate =[3];
				chubbyRotate[0] = Math.sin(realTime * height* 0.2);
				chubbyRotate[1] = Math.sin(realTime * height* 0.1);
				chubbyRotate[2] = Math.sin(realTime * height* 0.5);
				let swayChubby = chubbyRotate[0];

				gPush();
					gTranslate(0,0.95,0);
					//swayAngle rotates the seaweed along the origin so that it appears to sway back and forth
					let swayAngle = amplitude * Math.sin(frequency * realTime);
					if (curLevel == 2){swayChubby = chubbyRotate[1]}
					if (curLevel == 3){swayChubby = chubbyRotate[2]}

					gRotate(swayAngle, 0, 0, 1);
					gRotate(swayChubby,0,0,1);
					gTranslate(0,height,0);
					gPush();
						setColor(vec4(0,1.0,0,1.0));
						drawSphere();
					gPop();
				gPop()
			}
		gPop();
	}

	/////////////////////////////////////////////////////////
	///						FISH			              ///
	/////////////////////////////////////////////////////////

	//this gives my tail the wagging motion
	let tailRotate = 40 * Math.sin(10 * realTime)
	//fish
	gPush();
	//fish was going wrong way so i just flipped it and translated it up (down)
		gRotate(-180,1,0,1);
		gPush();
		//original translation to get fish in proper starting place
		gTranslate(orginRockPosition[0], orginRockPosition[1] + 6, orginRockPosition[2]);
			gPush();
				//this makes my fish point in the proper direction
				coneRotation[1] = coneRotation[1] + 50*dt;
				gRotate(coneRotation[1],0,1,0);
				//movement
				gPush();
					//this makes my fish move around the seaweed
					conePosition[0] = conePosition[0] + 0.5*Math.sin(conePosition[0] + 7);
					//this gives my fish the up and down movement
					conePosition[1] = Math.cos(realTime);
					//this actually moves the fish to the position previously calculated
					gTranslate(conePosition[0], conePosition[1], conePosition[2]);
					
					//fish face
					gPush();
						gScale(.5,0.5,-1);
						gPush();
							setColor(vec4(1.0,1.0,0.0,1.0));
							drawCone();
						gPop();
					gPop();
					
					// right eye
					gPush();
						gTranslate(0.3,-0.1,0.0);
						gPush();
							gScale(0.2,0.2,-0.2);
							gPush();
								setColor(vec4(1.0,1.0,1,1.0));
								drawSphere();
							gPop();
						gPop();
						
						//right pupil
						gPush();
							gTranslate(0,0,-0.14)
							gPush();
								gScale(0.1,0.1,0.1);
								gPush();
									setColor(vec4(0,0,0,1.0));
									drawSphere();
								gPop();
							gPop();
						gPop();
					gPop();

					//left eye
					gPush();
						gTranslate(-0.3,-0.1,0.0);
						gPush();
							gScale(0.2,0.2,0.2);
							gPush();
								setColor(vec4(1.0,1.0,1,1.0));
								drawSphere();
							gPop();
						gPop();
						
						//left pupil
						gPush();
							gTranslate(0,0,-0.14)
							gPush();
								gScale(0.1,0.1,0.1);
								gPush();
									setColor(vec4(0,0,0,1.0));
									drawSphere();
								gPop();
							gPop();
						gPop();
					gPop();

					//fish body
					gPush();
						gTranslate(0,0,1.5);
						gPush();
							gScale(.5,0.5,2);
							gPush();
								setColor(vec4(1,0,0,1.0));
								drawCone();
							gPop();
						gPop();
					gPop();

					//tail
					gPush();
						gTranslate(0,-0.4,2.5)
						gTranslate(0,0,-0.3);
						//this gives my tail the wagging motion. 
						//I had to translate, rotate, then translate back to get the tail to rotate around the orgin, not its centre.
						gRotate(tailRotate,0,1,0);
						gTranslate(0,0,+0.3);
						//bottom tail
						gPush();
							gRotate(60,1,0,0);
							gPush();
								gScale(0.2,0.2,0.8);
								gPush();
									
									setColor(vec4(1,0,0,1.0));
									drawCone();
								gPop();
							gPop();
						gPop();
						//top tail
						gPush();
						gTranslate(0,0.8,0);
							gPush();
								gRotate(-60,1,0,0);
								gPush();
									gScale(0.2,0.2,1);
									gPush();
										setColor(vec4(1,0,0,1.0));
										drawCone();
									gPop();
								gPop();
							gPop();
						gPop();
					gPop();
				gPop();
			gPop();
		gPop();
	gPop();
	/////////////////////////////////////////////////////////
	///					     CHARACTER		              ///
	/////////////////////////////////////////////////////////

	//these calculate the position for the characters right thigh and calf
	//I used chatgpt to help with limiting the rightCalfRotation to 0 and 45
	let rightLegRotation = -30 * Math.sin(realTime); 
	let rightCalfRotation =   45  + 0.8* rightLegRotation;
	rightCalfRotation = Math.max(0, Math.min(45, rightCalfRotation)); 

	//left leg is just the opposite of the right leg rotation (kind of)
	//because I gave the left leg a different inital rotation.
	let leftLegRotation = 30 * Math.sin(realTime);
	let leftCalfRotation = 45 + 0.8 * leftLegRotation; 
	leftCalfRotation = Math.max(-30, Math.min(45, leftCalfRotation));

	//these represent the character's movement in the x and y direction
	//thought it made sense that they move more in the y direction
	let personX = 0.5*Math.sin(realTime * 0.5); 
	let personY = 0.5*Math.sin(realTime);
	
	//character
	gPush();
	//offset by 3 and -5 since that is the original position of the character before it moves
		gTranslate(3 + personX,personY,-5);
		gPush();
			gRotate(-40,0,1,0);
			gPush();
			//torso 
				gScale(0.7,1.2,0.5);
				gPush();
					setColor(vec4(0.4,0,0.5,1.0));
					drawCube();
				gPop();
			gPop();
			//head
			gPush();
				gTranslate(0,1.7, 0);;
				gPush();
					gScale(0.5,0.5,0.5);
					gPush();
						setColor(vec4(0.4,0,0.5,1.0));
						drawSphere();
					gPop();
				gPop();
			gPop();
			//right thigh
			gPush();
				gRotate(20, 1, 0, 0)
				gPush();
					gTranslate(-0.47,-1.8,0.3);
					gTranslate(0,0.9,0);
					gPush();
						//rotates the whole right leg
						gRotate(rightLegRotation,1,0,0);
						gTranslate(0,-0.9,0);
					gPush();
						gScale(0.23,0.7 ,0.2);
						gPush();
							setColor(vec4(0.4,0,0.5,1.0));
							drawCube();
						gPop();
						//right calf
						gPush();
							gTranslate(0,-1.9,0);
							gTranslate(0,0.95,0);
							gPush();
								//rotates only the right calf and foot
								gRotate(rightCalfRotation,1,0,0);
								gTranslate(0,-0.95,0);
								gPush();
									setColor(vec4(0.4,0,0.5,1.0));
									drawCube();
								gPop();
								//right foot
								gPush();
									gTranslate(0,-0.95,0.4);
									gPush();
										gScale(1,0.2, 1.3)
										setColor(vec4(0.4,0,0.5,1.0));
										drawCube();
									gPop();
								gPop();
							gPop();
						gPop();
					gPop();
				gPop();
			gPop();

			//left thigh
			gPush();
				gPush();
					gTranslate(0.45,-1.8,0.3);
					gTranslate(0,0.9,0);
					gPush();
					//gives the whole left leg its rotation
						gRotate(leftLegRotation,1,0,0);
						gTranslate(0,-0.9,0);
					gPush();
						gScale(0.23,0.7 ,0.2);
						gPush();
							setColor(vec4(0.4,0,0.5,1.0));
							drawCube();
						gPop();
						//left calf
						gPush();
							gTranslate(0,-1.9,0);
							gTranslate(0,0.95,0);
							gPush();
							//rotates only the left calf and foot
								gRotate(leftCalfRotation,1,0,0);
								gTranslate(0,-0.95,0);
								gPush();
									setColor(vec4(0.4,0,0.5,1.0));
									drawCube();
								gPop();
								//left foot
								gPush();
									gTranslate(0,-0.95,0.4);
									gPush();
										gScale(1,0.2, 1.3)
										setColor(vec4(0.4,0,0.5,1.0));
										drawCube();
									gPop();
								gPop();
							gPop();
						gPop();
					gPop();
				gPop();
			gPop();
		gPop();
	gPop();


	/////////////////////////////////////////////////////////
	///					     BUBBLES		              ///
	/////////////////////////////////////////////////////////

	//this will add the height of the bubble into a bubbles array
	//I'm pretty sure earlier on I missed a pop on one of my translations, 
	//because I am perfectly lined up with the persons movement despite not doing anything
	//I wish i figured this out because the bubbles follow the persons x coordinate despite me not changing anything
	//I used chatGPT a little bit to help with the functions 
	function spawnBubble() {
		bubbles[numBubbles] = 1.5,
		numBubbles++;
	}
	
	//this will add a little bit to each bubbles height 
	function moveBubbles(){
		for (let i = 0; i < numBubbles; i++){
			bubbles[i]+=0.007;
		}
	}

	//this draws each bubble at its height according to bubbles[]
	function drawBubbles(){
		for (let i = 0; i < numBubbles; i ++){
			gPush();
				gTranslate(8.4,bubbles[i],10);
 				gPush();
					gScale(0.1,0.1,0.1)
					setColor(vec4(1,1,1,1.0));
					drawSphere();
				gPop();
			gPop();
		}
	}
	
	//this randomly generates the bubbles
	if ( (Math.floor(Math.random() * 150) + 1) == 2){
		spawnBubble();
	}
	//Since if a bubble is not spawned, but i have prevoulsy spawned bubbles, 
	//I still need to update their positions and draw them
	moveBubbles();
	drawBubbles();

    if( animFlag )
        window.requestAnimFrame(render);
}

// A simple camera controller which uses an HTML element as the event
// source for constructing a view matrix. Assign an "onchange"
// function to the controller as follows to receive the updated X and
// Y angles for the camera:
//
//   var controller = new CameraController(canvas);
//   controller.onchange = function(xRot, yRot) { ... };
//
// The view matrix is computed elsewhere.
function CameraController(element) {
	var controller = this;
	this.onchange = null;
	this.xRot = 0;
	this.yRot = 0;
	this.scaleFactor = 3.0;
	this.dragging = false;
	this.curX = 0;
	this.curY = 0;
	
	// Assign a mouse down handler to the HTML element.
	element.onmousedown = function(ev) {
		controller.dragging = true;
		controller.curX = ev.clientX;
		controller.curY = ev.clientY;
	};
	
	// Assign a mouse up handler to the HTML element.
	element.onmouseup = function(ev) {
		controller.dragging = false;
	};
	
	// Assign a mouse move handler to the HTML element.
	element.onmousemove = function(ev) {
		if (controller.dragging) {
			// Determine how far we have moved since the last mouse move
			// event.
			var curX = ev.clientX;
			var curY = ev.clientY;
			var deltaX = (controller.curX - curX) / controller.scaleFactor;
			var deltaY = (controller.curY - curY) / controller.scaleFactor;
			controller.curX = curX;
			controller.curY = curY;
			// Update the X and Y rotation angles based on the mouse motion.
			controller.yRot = (controller.yRot + deltaX) % 360;
			controller.xRot = (controller.xRot + deltaY);
			// Clamp the X rotation to prevent the camera from going upside
			// down.
			if (controller.xRot < -90) {
				controller.xRot = -90;
			} else if (controller.xRot > 90) {
				controller.xRot = 90;
			}
			// Send the onchange event to any listener.
			if (controller.onchange != null) {
				controller.onchange(controller.xRot, controller.yRot);
			}
		}
	};
}
