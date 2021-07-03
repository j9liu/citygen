#version 300 es
precision highp float;

uniform vec3 u_Eye, u_Ref, u_Up;
uniform float u_Time;

uniform vec3 u_LightDirections[3];
uniform vec3 u_LightColors[3];

in vec4  fs_Pos;
in vec4  fs_Nor;
//in vec4  fs_Col;
in vec2  fs_UV;
in float fs_FloorType;

out vec4 out_Col;

// Many of the following functions are pulled from this shader:
// https://thebookofshaders.com/edit.php#11/wood.frag

float random2D(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898,78.233)))
                * 43758.5453123);
}

float random3D(vec3 p) {
	vec2 intermediateVal = sin(vec2(203.311f * p.y, p.z * sin(0.324f
							+ 140.0f * p.z)));
	return fract(dot(intermediateVal, intermediateVal));
}

float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f*f*(3.0-2.0*f);
    return mix( mix( random2D( i + vec2(0.0,0.0) ),
                     random2D( i + vec2(1.0,0.0) ), u.x),
                mix( random2D( i + vec2(0.0,1.0) ),
                     random2D( i + vec2(1.0,1.0) ), u.x), u.y);
}

mat2 rotate2d(float angle){
    return mat2(cos(angle),-sin(angle),
                sin(angle),cos(angle));
}

mat3 rotate3d (float angle, vec3 axis) {
	axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

float lines(float p, float b){
    float scale = 10.0;
    p *= scale;
    return smoothstep(0.0,
                    .5+b*.5,
                    abs((sin(p*3.1415)+b*2.0))*.5);
}

float squareWave(float x, float freq, float amplitude) {
	return abs( float(int(floor(x * freq)) % 2) * amplitude);
}

float interpNoise2D(float x, float y) {
	float intX = floor(x);
	float fractX = fract(x);
	float intY = floor(y);
	float fractY = fract(y);

	float v1 = random2D(vec2(intX, intY));
	float v2 = random2D(vec2(intX + 1.0f, intY));
	float v3 = random2D(vec2(intX, intY + 1.0f));
	float v4 = random2D(vec2(intX + 1.0f, intY + 1.0f));

	float i1 = mix(v1, v2, fractX);
	float i2 = mix(v3, v4, fractX);
	return mix(i1, i2, fractY);
}

float fbm2(vec2 p) {
	float total = 0.0f;
	float persistence = 0.5f;
	int octaves = 8;

	for(int i = 0; i < octaves; i++) {
		float freq = pow(2.0f, float(i));
		float amp = pow(persistence, float(i));

		total += interpNoise2D(p.x * freq, p.y * freq) * amp;
	}

	return total;
}

float perturbedFbm(vec2 p)
  {
      vec2 q = vec2( fbm2( p + vec2(0.0,0.0) ),
                     fbm2( p + vec2(5.2,1.3) ) );

      vec2 r = vec2( fbm2( p + 4.0*q + vec2(9.7,9.2) ),
                     fbm2( p + 4.0*q + vec2(8.3,2.8) ) );

      return fbm2( p + 4.0*r );
  }

vec2 generate_point(vec2 cell, float cell_size) {
    vec2 p = vec2(cell.x, cell.y);
    p += fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)) * 43758.5453)));
    return p * cell_size;
}

float worleyNoise(vec2 pixel, float cell_size) {
    vec2 cell = floor(pixel / cell_size);

    vec2 point = generate_point(cell, cell_size);

    float shortest_distance = length(pixel - point);

   // compute shortest distance from cell + neighboring cell points

    for(float i = -1.0f; i <= 1.0f; i += 1.0f) {
        float ncell_x = cell.x + i;
        for(float j = -1.0f; j <= 1.0f; j += 1.0f) {
            float ncell_y = cell.y + j;

            // get the point for that cell
            vec2 npoint = generate_point(vec2(ncell_x, ncell_y), cell_size);

            // compare to previous distances
            float distance = length(pixel - npoint);
            if(distance < shortest_distance) {
                shortest_distance = distance;
            }
        }
    }

    return shortest_distance / cell_size;
}

/////////////////////////////////////////
// COSINE PALETTE FUNCTIONS
/////////////////////////////////////////

// Taken from https://www.iquilezles.org/www/articles/palettes/palettes.htm
// and modified with this tool http://erkaman.github.io/glsl-cos-palette/
vec3 neonPalette(float t)
{
	vec3 a = vec3(0.5, 0.5, 0.5);
	vec3 b = vec3(0.5, 0.5, 0.5);
	vec3 c = vec3(2.0, 1.0, 0.0);
	vec3 d = vec3(0.50, 0.20, 0.25);
    return a + b * cos(6.28318*(c*t+d));
}

vec3 redOrangeBluePalette(float t) {
	vec3 a = vec3(0.6, 0.4, 0.8);
	vec3 b = vec3(0.4, 0.2, 0.6);
	vec3 c = vec3(2.0, 1.0, 2.0);
	vec3 d = vec3(0.3, 0.2, 0.6);
    return a + b * cos(6.28318*(c*t+d));
}

vec3 rainbowPalette1(float t) {
	vec3 a = vec3(0.5, 0.5, 0.5);
	vec3 b = vec3(0.5, 0.5, 0.5);
	vec3 c = vec3(1.0, 0.7, 0.4);
	vec3 d = vec3(0.00, 0.15, 0.20);
    return a + b * cos(6.28318*(c*t+d));
}

vec3 rainbowPalette2(float t) {
	vec3 a = vec3(0.5, 0.51, 0.5);
	vec3 b = vec3(0.5, 0.5, 0.5);
	vec3 c = vec3(1.0, 0.69, 0.4);
	vec3 d = vec3(0.74, 0.92, 0.96);
    return a + b * cos(6.28318*(c*t+d));
}

/////////////////////////////////////////
// WINDOW GENERATING FUNCTIONS
/////////////////////////////////////////

vec4 fourWindowsSquare(vec2 uv,
						 vec4 originalColor,
						 vec4 windowColor,
						 vec4 paneColor) {
	vec2 tiledUV = uv * 2.0;
	tiledUV = fract(tiledUV);
	if( (tiledUV.y >= 0.35 && tiledUV.y <= 0.65) &&
		(tiledUV.x >= 0.25 && tiledUV.x <= 0.75)) {

		if( (tiledUV.y <= 0.39 || tiledUV.y >= 0.61) ||
			(tiledUV.x <= 0.3 || tiledUV.x >= 0.7)) {
			return paneColor;
		}

		return windowColor;

	}


    return originalColor;
}

vec4 fourWindowsLong(vec2 uv,
						 vec4 originalColor,
						 vec4 windowColor,
						 vec4 paneColor) {
	vec2 tiledUV = uv * 2.0;
	tiledUV = fract(tiledUV);
	if( (tiledUV.y >= 0.4 && tiledUV.y <= 0.6) &&
		(tiledUV.x >= 0.05 && tiledUV.x <= 0.95)) {

		if( (tiledUV.y <= 0.37 || tiledUV.y >= 0.57) ||
			(tiledUV.x <= 0.08 || tiledUV.x >= 0.92)) {
			return paneColor;
		}

		return windowColor;

	}

    return originalColor;
}

vec4 nineWindowsLong(vec2 uv,
						 vec4 originalColor,
						 vec4 windowColor,
						 vec4 paneColor) {
	vec2 tiledUV = uv * 3.0;
	tiledUV = fract(tiledUV);
	if( (tiledUV.y >= 0.4 && tiledUV.y <= 0.6) &&
		(tiledUV.x >= 0.05 && tiledUV.x <= 0.95)) {

		if( (tiledUV.y <= 0.37 || tiledUV.y >= 0.57) ||
			(tiledUV.x <= 0.08 || tiledUV.x >= 0.92)) {
			return paneColor;
		}

		return windowColor;

	}

    return originalColor;
}

vec4 thinLongDoubleWindow(vec2 uv,
				  vec4 originalColor,
				  vec4 windowColor,
				  vec4 paneColor) {
	if( (uv.y >= 0.33 && uv.y <= 0.4) ||
    	(uv.y >= 0.67 && uv.y <= 0.74) ) {
		if( (uv.x >= 0.25 && uv.x <= 0.3) ||
			(uv.x >= 0.7 && uv.x <= 0.75) ) {
	    	return paneColor;
	    }
	    else {
	    	return windowColor;
	    }
    }

    return originalColor;
}

vec4 singleMediumWindow(vec2 uv,
				  vec4 originalColor,
				  vec4 windowColor,
				  vec4 paneColor) {
	if( (uv.y >= 0.35 && uv.y <= 0.65) &&
		(uv.x >= 0.25 && uv.x <= 0.75)) {

		if( (uv.y <= 0.39 || uv.y >= 0.61) ||
			(uv.x <= 0.3 || uv.x >= 0.7)) {
			return paneColor;
		}

		return windowColor;

	}

    return originalColor;
}

vec4 singleLargeWindow(vec2 uv,
				  vec4 originalColor,
				  vec4 windowColor,
				  vec4 paneColor) {
	if( (uv.y >= 0.35 && uv.y <= 0.65) &&
		(uv.x >= 0.10 && uv.x <= 0.90)) {

		if( (uv.y <= 0.39 || uv.y >= 0.61) ||
			(uv.x <= 0.14 || uv.x >= 0.84)) {
			return paneColor;
		}

		return windowColor;

	}

    return originalColor;
}

vec4 addWindows(float floorType, float windowType, vec2 uv, vec4 buildingColor, vec3 normal) {
    // If the face is the top or bottom of the polyhedron, don't add a window.
    // Also don't add the window if windowType == 0
    if(abs(normal.y) > 0.7 || abs(windowType) < 0.01) {
    	return buildingColor;
    } 

    vec4 windowCol = vec4(0, 0, 0, 1);

    // vec4 window = vec4(88.0, 183.0, 209.0, 255.0) / 255.0;
    if(floorType >= 19.98f) {
		vec3 rainbow = neonPalette(u_Time / 250.0);
    	vec3 pink = vec3(230.0, 138.0, 226.0) / 255.0;
    	windowCol = vec4(mix(pink, rainbow, sin(u_Time / 250.0)), 1);
    } else if(floorType >= 9.98f) {
    	vec3 pink = vec3(230.0, 138.0, 226.0) / 255.0;
		vec3 orange = vec3(232.0, 181.0, 70.0) / 255.0;
		vec3 yellow = vec3(250.0, 227.0, 52.0) / 255.0;
		windowCol = vec4(mix(orange, yellow, sin(u_Time / 200.0)) + pink, 1);
    }

    vec4 finalCol = buildingColor;

	if(abs(windowType - 1.0f) < 0.01f) {
		finalCol = nineWindowsLong(uv, buildingColor, windowCol, buildingColor);
	} else if(abs(windowType - 2.0f) < 0.01f) {
		finalCol = fourWindowsLong(uv, buildingColor, windowCol, buildingColor);
	} else if(abs(windowType - 3.0f) < 0.01f) {
		finalCol = thinLongDoubleWindow(uv, buildingColor, windowCol, buildingColor);
	} else if(abs(windowType - 4.0f) < 0.01f) {
		finalCol = fourWindowsSquare(uv, buildingColor, windowCol, buildingColor);
	} else if(abs(windowType - 5.0f) < 0.01f) {
		finalCol = singleLargeWindow(uv, buildingColor, windowCol, buildingColor);
	}

	return finalCol;
}

/////////////////////////////////////////
// BUILDING TEXTURE FUNCTION
/////////////////////////////////////////

// Determine the base color of the floor.
// Uses float equality measures.

vec4 getFloorTexture(float floorType, vec2 uv, vec3 pos, vec3 normal) {
	vec4 floorCol = vec4(0, 0, 0, 1);
	float windowType = 0.0f;

	// Neon red (debugging)
	if(abs(floorType + 2.0f) < 0.01f) { 
		return vec4(1, 0, 0, 1);
	}

	// Neon green (debugging)
	else if(abs(floorType + 1.0f) < 0.01f) {	
		return vec4(0, 1, 0, 1);
	}

	else if(floorType >= 99.98f) {
		float noise = fbm2(uv * 24.0);
		noise = pow(noise, 4.0);
		if(noise > 5.2) {
			floorCol = vec4(0.2, 0.2, 0.2, 1);
		} else {
			floorCol = vec4(1);
		}
	}

	// Dark purple with wave accents
	else if(floorType >= 19.98f) {
		/*float diffX = worleyNoise(uv + vec2(0.05, 0), 0.5) - worleyNoise(uv - vec2(0.05, 0), 0.5);
		float diffY = worleyNoise(uv + vec2(0, 0.05), 0.5) - worleyNoise(uv - vec2(0, 0.05), 0.5);
		float gradient = diffX + diffY;
		gradient /= 2.0;*/
		windowType = floorType - 20.0f;

		vec3 basePurple = vec3(16.0, 04.0, 50.0) / 255.0;
		vec3 accentPurple = vec3(98.0, 67.0, 99.0) / 255.0;
		
		vec2 newPos = 0.5 * vec2(uv.x + pos.y, uv.y + pos.y);
		vec2 distortedPos = rotate2d(noise(newPos) + 180.0) * newPos;
		
		float pattern = lines(distortedPos.y,.6);
		vec3 col = basePurple + 0.3 * accentPurple * (1.0 - pattern);

		/*vec3 palette = rainbowPalette2(u_Time / 500.0);
		vec2 distortedPos1 = rotate2d(noise(newPos)) * newPos;
		float pattern1 = lines(distortedPos1.y,.8);
		vec3 col = 0.1 * mix(vec3(0), palette, 1.0 - pattern1);*/
		floorCol = vec4(col, 1);
		
	}

	// Slightly textured blue
	else if(floorType >= 9.98f) {
		vec3 blue = vec3(40.0, 113.0, 126.0) / 255.0;
		vec3 watermelonGreen = vec3(64.0, 227.0, 156.0) / 255.0;
		vec3 darkBlue = vec3(2.0, 20.0, 38.0) / 255.0;

		float stripeVal = random3D(vec3(uv.x, uv.y, pos.y) / 5.0);
		float waveVal = squareWave(uv.y, 3.0, 1.0);

		vec3 col = darkBlue;
		if(waveVal < 0.5 && stripeVal <= 0.05) {
			if(stripeVal < 0.02) {
				col += watermelonGreen / 2.0;
			} else {
				col += blue / 5.0;
			}
		}

		floorCol = vec4(col, 1);
		windowType = floorType - 10.0f;
	}

	// Animated turquoise rings texture
	else if(abs(floorType - 1.0f) < 0.01f) {
		vec3 brightGreen = vec3(2.0, 209.0, 147.0) / 255.0;
		vec3 cyan = vec3(2.0, 209.0, 202.0) / 255.0;
		vec2 timeOffset = vec2(u_Time / 1000.0, cos(u_Time / 700.0));

		float pattern = perturbedFbm(vec2(worleyNoise(uv * 0.2 + pos.xz / 50.0 + timeOffset, 2.0)));
		pattern = pow(pattern, 3.0);

		vec3 mixedCol = mix(brightGreen, cyan, abs(cos(u_Time / 600.0)));
		vec3 col = mixedCol * (0.1 + pattern * 0.25);
		floorCol = vec4(col, 1);
	}

	// Animated stripe texture
	else if(abs(floorType - 2.0f) < 0.01f) {
	/*	vec3 basePurple = vec3(16.0, 04.0, 50.0) / 255.0;
		vec3 accentPurple = vec3(24.5, 16.75, 24.75) / 255.0;
		
		vec2 newPos = 0.1 * vec2(uv.x + pos.y, uv.y + pos.y);
		newPos += vec2(u_Time / 1200.0);
		vec2 distortedPos = rotate2d(noise(newPos) + 180.0) * newPos;
		
		float pattern = lines(distortedPos.y,.2);
		vec3 col = basePurple + 0.5 * accentPurple * (1.0 - pattern);

		//vec3 palette = rainbowPalette2(u_Time / 500.0);
		//vec2 distortedPos1 = rotate2d(noise(newPos)) * newPos;
		//float pattern1 = lines(distortedPos1.y,.8);
		//col += 0.1 * mix(vec3(0), palette, 1.0 - pattern1);
		
		floorCol = vec4(col, 1);*/
	}
	else if(abs(floorType - 3.0f) < 0.01f) {
		float pattern = worleyNoise(uv + pos.xz / 50.0, 2.0 + sin(u_Time / 500.0));
		pattern = pow(pattern, 2.0);
		vec3 palette = redOrangeBluePalette((u_Time + pos.y) / 1000.0);
		floorCol = vec4(pattern * palette, 1);

		/*float pattern = pow(perturbedFbm(uv / vec2(40.0, 3.0) + vec2(u_Time / 1000.0, cos(u_Time / 700.0))), 5.0);
		pattern = worleyNoise(vec2(pattern), 1.0);
		floorCol = vec4(vec3(pattern), 1);*/
	}

	vec4 finalCol = addWindows(floorType, windowType, uv, floorCol, normal);
	return finalCol;
}


void main()
{
	vec3 normal = fs_Nor.xyz;
    //vec4 albedo = squareWave(fs_Pos.y, 2.0, 1.0) * vec4(1, 0, 0, 1);
    //vec4 secondary = squareWave(fs_UV.x, 2.0, 1.0) * vec4(0.7, 0.5, 0.2, 1);

    vec4 albedo = getFloorTexture(fs_FloorType, fs_UV, fs_Pos.xyz, normal);

	float lambert1 = 0.8 * clamp(dot(normalize(normal), normalize(u_LightDirections[0])), 0.0, 1.0);
	float lambert2 = 0.8 * clamp(dot(normalize(normal), normalize(u_LightDirections[1])), 0.0, 1.0);
	float lambert3 = 0.25 * clamp(dot(normalize(normal), normalize(u_LightDirections[2])), 0.0, 1.0);
	// Add ambient lighting
	float ambientTerm = 0.2;
	float lightIntensity = lambert1 + lambert2 + ambientTerm;
	//vec3 shadow = 0.3 * shadowColor * (1.0 - lightIntensity);
	//return vec4(clamp(base * lightIntensity + shadow, 0.0f, 1.0f), 1.0f);

	out_Col = clamp(albedo * (lambert1 + lambert2 + lambert3), 0.0f, 1.0f);
	out_Col.w = 1.;
}
