
/**
 * @file A simple WebGL example for viewing meshes read from OBJ files
 * @author Eric Shaffer <shaffer1@illinois.edu>  
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program */
var shaderProgram;
var shaderProgramSkybox;

/** @global The Modelview matrix */
var mvMatrix = mat4.create();

/** @global The View matrix */
var vMatrix = mat4.create();

/** @global The Projection matrix */
var pMatrix = mat4.create();

/** @global The Normal matrix */
var nMatrix = mat3.create();

var rMatrix = mat4.create();

var rTeapotMatrix = mat4.create();

var reflectiveTeapot = 1.0;

/** @global The matrix stack for hierarchical modeling */
var mvMatrixStack = [];

/** @global An object holding the geometry for a 3D mesh */
var myMesh;
var mySkyBox;

// Texture variables
var cubeImage0;
var cubeImage1;
var cubeImage2;
var cubeImage3;
var cubeImage4;
var cubeImage5;
var cubeImages = [cubeImage0, cubeImage1, cubeImage2, cubeImage3, cubeImage4, cubeImage5];
var cubeMap;
var texturesLoaded = 0;


// View parameters
/** @global Location of the camera in world coordinates */
var eyePt = vec3.fromValues(0.0,1.5,13.0);
/** @global Direction of the view in world coordinates */
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = vec3.fromValues(0.0,1.0,0.0);
/** @global Location of a point along viewDir in world coordinates */
var viewPt = vec3.fromValues(0.0,0.0,0.0);
// Field of View
var fov = 70

//Light parameters
/** @global Light position in VIEW coordinates */
var lightPosition = [5,5,5];
/** @global Ambient light color/intensity for Phong reflection */
var lAmbient = [0.05,0.05,0.05];
/** @global Diffuse light color/intensity for Phong reflection */
var lDiffuse = [0.8,0.8,0.8];//[1,1,1];
/** @global Specular light color/intensity for Phong reflection */
var lSpecular = [0.6,0.6,0.6];

//Material parameters
/** @global Ambient material color/intensity for Phong reflection */
var kAmbient = [0.8,0.8,0.8];
/** @global Diffuse material color/intensity for Phong reflection */
var kTerrainDiffuse = [120.0/255.0,120.0/255.0,120.0/255.0];
/** @global Specular material color/intensity for Phong reflection */
var kSpecular = [1.0,1.0,1.0];
/** @global Shininess exponent for Phong reflection */
var shininess = 40;
/** @global Edge color fpr wireframeish rendering */
var kEdgeBlack = [0.0,0.0,0.0];
/** @global Edge color for wireframe rendering */
var kEdgeWhite = [1.0,1.0,1.0];


// Movement variables
var eulerY = 0;
var teapotX = 0;
var teapotY = 0;
var teapot_mov_scale = 20;

//-------------------------------------------------------------------------
/**
 * Asynchronously read a server-side text file
 */
function asyncGetFile(url) {
  console.log("Getting text file");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
    console.log("Made promise");
  });
}


//Texture loading functions
function asyncGetFileFace(url, face) {
  console.log("Getting image");
  return new Promise((resolve, reject) => {
    cubeImages[face] = new Image();
    cubeImages[face].onload = () => resolve({url, status: 'ok'});
    cubeImages[face].onerror = () => reject({url, status: 'error'});
    cubeImages[face].src = url
    console.log("Made promise");  
  });
}

function setupPromise(filename, face) {
    myPromise = asyncGetFileFace(filename, face);
    // We define what to do when the promise is resolved with the then() call,
    // and what to do when the promise is rejected with the catch() call
    myPromise.then((status) => {
        handleTextureLoaded(cubeImages[face], face)
        console.log("Yay! got the file");
    })
    .catch(
        // Log the rejection reason
       (reason) => {
            console.log('Handle rejected promise ('+reason+') here.');
        });
}

function setupTextures() {
  cubeMap = gl.createTexture();
  setupPromise("f.jpeg", 0);
  setupPromise("f.jpeg", 1);
  setupPromise("f.jpeg", 2);
  setupPromise("f.jpeg", 3);
  setupPromise("f.jpeg", 4);
  setupPromise("f.jpeg", 5);
}

function handleTextureLoaded(image, face) {
  console.log('handleTextureLoaded, image = ' + image);
  texturesLoaded++;

  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

  if(face == 0)
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  else if(face == 1)
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  else if(face == 2)
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  else if(face == 3)
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  else if(face == 4)
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  else if(face == 5)
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Clamping
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Filtering
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}

//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
  gl.uniformMatrix4fv(shaderProgram.rMatrixUniform, false, rMatrix);
  gl.uniformMatrix4fv(shaderProgram.rTeapotMatrixUniform, false, rTeapotMatrix);
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
    setReflectiveUniform(reflectiveTeapot);
}

function setMatrixUniformsSkyBox() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgramSkybox.nMatrixUniform, false, nMatrix);
  gl.uniformMatrix4fv(shaderProgramSkybox.mvMatrixUniform, false, mvMatrix);
  gl.uniformMatrix4fv(shaderProgramSkybox.pMatrixUniform, false, pMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.rMatrixUniform = gl.getUniformLocation(shaderProgram, "uRMatrix");
  shaderProgram.rTeapotMatrixUniform = gl.getUniformLocation(shaderProgram, "uRTeapotMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
  shaderProgram.uniformDiffuseMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
  shaderProgram.uniformAmbientMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
  shaderProgram.uniformSpecularMaterialColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");

  shaderProgram.uniformReflectiveLoc = gl.getUniformLocation(shaderProgram, "uIsReflective");

  shaderProgram.uniformShininessLoc = gl.getUniformLocation(shaderProgram, "uShininess");
}

// Setup the shaders for the skybox
function setupShaderSkyBox() {
  vertexShader = loadShaderFromDOM("shader-vs-skybox");
  fragmentShader = loadShaderFromDOM("shader-fs-skybox");

  shaderProgramSkybox = gl.createProgram();
  gl.attachShader(shaderProgramSkybox, vertexShader);
  gl.attachShader(shaderProgramSkybox, fragmentShader);
  gl.linkProgram(shaderProgramSkybox);

  if (!gl.getProgramParameter(shaderProgramSkybox, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgramSkybox);

  shaderProgramSkybox.vertexPositionAttribute = gl.getAttribLocation(shaderProgramSkybox, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgramSkybox.vertexPositionAttribute);

  //shaderProgramSkybox.vertexNormalAttribute = gl.getAttribLocation(shaderProgramSkybox, "aVertexNormal");
  //gl.enableVertexAttribArray(shaderProgramSkybox.vertexNormalAttribute);

  shaderProgramSkybox.mvMatrixUniform = gl.getUniformLocation(shaderProgramSkybox, "uMVMatrix");
  shaderProgramSkybox.pMatrixUniform = gl.getUniformLocation(shaderProgramSkybox, "uPMatrix");
  shaderProgramSkybox.nMatrixUniform = gl.getUniformLocation(shaderProgramSkybox, "uNMatrix");
}

//-------------------------------------------------------------------------
/**
 * Sends material information to the shader
 * @param {Float32} alpha shininess coefficient
 * @param {Float32Array} a Ambient material color
 * @param {Float32Array} d Diffuse material color
 * @param {Float32Array} s Specular material color
 */
function setMaterialUniforms(alpha,a,d,s) {
  gl.uniform1f(shaderProgram.uniformShininessLoc, alpha);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColorLoc, s);
}

// Sends if the shader should use the texture or not for the teapot
function setReflectiveUniform(r) {
  gl.uniform1f(shaderProgram.uniformReflectiveLoc, r);
}

//-------------------------------------------------------------------------
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function setLightUniforms(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

// Function to get rid of a warning when switching shader programs
// http://www.mjbshaw.com/2013/03/webgl-fixing-invalidoperation.html
function switchPrograms(currentProgram, newProgram) {
    // Gets the number of attributes in the current and new programs
    var currentAttributes = gl.getProgramParameter(currentProgram, gl.ACTIVE_ATTRIBUTES);
    var newAttributes = gl.getProgramParameter(newProgram, gl.ACTIVE_ATTRIBUTES);

    // Fortunately, in OpenGL, attribute index values are always assigned in the
    // range [0, ..., NUMBER_OF_VERTEX_ATTRIBUTES - 1], so we can use that to
    // enable or disable attributes
    if (newAttributes > currentAttributes) // We need to enable the missing attributes
    {
        for (var i = currentAttributes; i < newAttributes; i++)
        {
            gl.enableVertexAttribArray(i);
        }
    }
    else if (newAttributes < currentAttributes) // We need to disable the extra attributes
    {
        for (var i = newAttributes; i < currentAttributes; i++)
        {
            gl.disableVertexAttribArray(i);
        }
    }

    // With all the attributes now enabled/disabled as they need to be, let's switch!
    gl.useProgram(newProgram);
}

//----------------------------------------------------------------------------------
/**
 * Populate buffers with data
 */
function setupMesh(filename) {
  myMesh = new TriMesh();
  myPromise = asyncGetFile(filename);

  myPromise.then((retrievedText) => {
    myMesh.loadFromOBJ(retrievedText);
    console.log("Yay! Got the file");
  })
  .catch(
    (reason) => {
      console.log('[ERROR] Rejected promise.');
      console.log(reason);
    });
}

//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
    // Clear frame buffer before drawing
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Rotate the model-view matrix to move around the teapot (outside of the push and pops)
    mat4.rotateY(mvMatrix, mvMatrix, degToRad(eulerY));
    mat4.rotateY(rMatrix, rMatrix, degToRad(-eulerY));

    // Perspective matrix
    mat4.perspective(pMatrix,degToRad(fov), gl.viewportWidth / gl.viewportHeight, 0.1, 500.0);
    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    
    // Then generate the lookat matrix and initialize the view matrix to that view
    mat4.lookAt(vMatrix,eyePt,viewPt,up);

    // Note: we must change the GL state to use the correct shader before we call draw for that part of the scene

    // Draw SkyBox
    if(texturesLoaded == 6) {
      var save_eyePt = eyePt;
      switchPrograms(shaderProgram, shaderProgramSkybox);
      setMatrixUniformsSkyBox();
      mySkyBox.drawTriangles();
    }
    
    // Draw Mesh
    if(myMesh.loaded() && (texturesLoaded == 6)) {
      mvPushMatrix(); // Push mvMatrix to make teapot specific transformations
      switchPrograms(shaderProgramSkybox, shaderProgram);
      //mat4.rotateY(mvMatrix, mvMatrix, degToRad(teapotY));
      //mat4.rotateX(mvMatrix, mvMatrix, degToRad(teapotX));
      mat4.rotateY(rTeapotMatrix, rTeapotMatrix, degToRad(teapotY));
      mat4.rotateX(rTeapotMatrix, rTeapotMatrix, degToRad(teapotX));
      mat4.multiply(mvMatrix,vMatrix,mvMatrix);

        reflectiveTeapot = 1.0;

      setMatrixUniforms();
      setLightUniforms(lightPosition,lAmbient,lDiffuse,lSpecular);
  
      setMaterialUniforms(shininess,kAmbient, kTerrainDiffuse,kSpecular); 
      myMesh.drawTriangles();
      mvPopMatrix();
    }
  
}

//----------------------------------------------------------------------------------
//Code to handle user interaction
var currentlyPressedKeys = {};

function handleKeyDown(event) {
  //console.log("Key down ", event.key, " code ", event.code);
  currentlyPressedKeys[event.key] = true;
    if (currentlyPressedKeys["a"]) {
      // key A
      eulerY -= 1;
  } else if (currentlyPressedKeys["d"]) {
      // key D
      eulerY += 1;
  } 

  if (currentlyPressedKeys["ArrowUp"]){
      // Up cursor key
      event.preventDefault();
      teapotX -= 0.1 * teapot_mov_scale;
  } else if (currentlyPressedKeys["ArrowDown"]){
      event.preventDefault();
      // Down cursor key
      teapotX += 0.1 * teapot_mov_scale;
  }

  if (currentlyPressedKeys["ArrowRight"]){
      // Right cursor key
      event.preventDefault();
      teapotY += 0.1 * teapot_mov_scale;
  } else if (currentlyPressedKeys["ArrowLeft"]){
      event.preventDefault();
      // Left cursor key
      teapotY -= 0.1 * teapot_mov_scale;
  }
    
}

function TdownButton() {
  teapotX += 0.1 * teapot_mov_scale;
}

function TupButton() {
  teapotX -= 0.1 * teapot_mov_scale;
}

function TrightButton() {
  teapotY += 0.1 * teapot_mov_scale;
}

function TleftButton() {
  teapotY -= 0.1 * teapot_mov_scale;
}

function rightButton() {
  eulerY += 1;
}

function leftButton() {
  eulerY -= 1;
}

function handleKeyUp(event) {
  //console.log("Key up ", event.key, " code ", event.code);
  currentlyPressedKeys[event.key] = false;
}

function setupSkyBox() {
  mySkyBox = new SkyBox();
  mySkyBox.loadBuffer();
  mySkyBox.generateNormals();
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupShaderSkyBox();
  setupMesh("teapot.obj");
  setupSkyBox();
  setupTextures();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  tick();
}


//----------------------------------------------------------------------------------
/**
  * Update any model transformations
  */
function animate() {
   //console.log(eulerX, " ", eulerY, " ", eulerZ); 
   document.getElementById("eY").value=eulerY;
   document.getElementById("eZ").value=eyePt[2];   
}


//----------------------------------------------------------------------------------
/**
 * Keeping drawing frames....
 */
function tick() {
    requestAnimFrame(tick);
    //animate();
    draw();
}

