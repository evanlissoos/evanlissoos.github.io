class SkyBox {
	constructor() {
        // Coordinates for the skybox
		this.skyBoxvBuffer = [
                -1.0,  1.0, -1.0,
                -1.0, -1.0, -1.0,
                 1.0, -1.0, -1.0,
                 1.0, -1.0, -1.0,
                 1.0,  1.0, -1.0,
                -1.0,  1.0, -1.0,

                -1.0, -1.0,  1.0,
                -1.0, -1.0, -1.0,
                -1.0,  1.0, -1.0,
                -1.0,  1.0, -1.0,
                -1.0,  1.0,  1.0,
                -1.0, -1.0,  1.0,

                 1.0, -1.0, -1.0,
                 1.0, -1.0,  1.0,
                 1.0,  1.0,  1.0,
                 1.0,  1.0,  1.0,
                 1.0,  1.0, -1.0,
                 1.0, -1.0, -1.0,

                -1.0, -1.0,  1.0,
                -1.0,  1.0,  1.0,
                 1.0,  1.0,  1.0,
                 1.0,  1.0,  1.0,
                 1.0, -1.0,  1.0,
                -1.0, -1.0,  1.0,

                -1.0,  1.0, -1.0,
                 1.0,  1.0, -1.0,
                 1.0,  1.0,  1.0,
                 1.0,  1.0,  1.0,
                -1.0,  1.0,  1.0,
                -1.0,  1.0, -1.0,

                -1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0,
                 1.0, -1.0, -1.0,
                 1.0, -1.0, -1.0,
                -1.0, -1.0,  1.0,
                 1.0, -1.0,  1.0
        ];
	}

	loadBuffer() {
		//Setup skybox
        this.SkyBoxVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SkyBoxVertexPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.skyBoxvBuffer), gl.STATIC_DRAW);
        this.SkyBoxVertexPositionBuffer.itemSize = 3;
        this.SkyBoxVertexPositionBuffer.numberOfItems = 36;
	}

	drawTriangles() {
        // Bind the vertex buffer data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.SkyBoxVertexPositionBuffer);
        gl.vertexAttribPointer(shaderProgramSkybox.vertexPositionAttribute, this.SkyBoxVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //gl.bindBuffer(gl.ARRAY_BUFFER, this.SkyBoxVertexNormalBuffer);
        //gl.vertexAttribPointer(shaderProgramSkybox.vertexNormalAttribute, this.SkyBoxVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

        //gl.drawElements(gl.TRIANGLES, this.IndexTriBuffer.numItems, gl.UNSIGNED_INT,0);

        // Bind the skybox texture
        gl.activeTexture(gl.TEXTURE0);
  		gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  		gl.uniform1i(gl.getUniformLocation(shaderProgramSkybox, "uCubeSampler"), 0);
  		
        gl.drawArrays(gl.TRIANGLES, 0, this.SkyBoxVertexPositionBuffer.numberOfItems);
    }

    // Don't need to generate normals for the skybox since only doing basic texture sampling
    generateNormals() {
    }

}