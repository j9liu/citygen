#version 300 es

uniform mat4 u_Model;
uniform vec2 u_Dimensions; // We use this to refer to the scale of the plane
uniform mat4 u_ViewProj;

uniform mat3 u_CameraAxes; // Used for rendering particles as billboards (quads that are always looking at the camera)
// gl_Position = center + vs_Pos.x * camRight + vs_Pos.y * camUp;

uniform float u_WaterLevel;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;

out vec3 fs_Pos;
out vec3 fs_Nor;

/* NOISE FUNCTIONS */

float random(vec2 p, vec2 seed) {
  return fract(sin(dot(p + seed, vec2(127.1f, 311.7f))) * 43758.5453f);
}

float interpNoise2D(float x, float y) {
	int intX = int(floor(x));
	float fractX = fract(x);
	int intY = int(floor(y));
	float fractY = fract(y);

	float v1 = random(vec2(intX, intY), vec2(0.));
	float v2 = random(vec2(intX + 1, intY), vec2(0.));
	float v3 = random(vec2(intX, intY + 1), vec2(0.));
	float v4 = random(vec2(intX + 1, intY + 1), vec2(0.));

	/*float i1 = smoothstep(v1, v2, v1 + (v2 - v1) * fractX);
	if(v1 > v2) {
		i1 = smoothstep(v2, v1, v2 + (v1 - v2) * fractX);
	}*/
	float i1 = mix(v1, v2, fractX);
	float i2 = mix(v3, v4, fractX);
	return mix(i1, i2, fractY);
}

float fbm2(vec2 p) {
	float total = 0.0f;
	float persistence = 0.5f;
	int octaves = 8;

	float freq = .5;
	float amp = 1. / persistence;

	for(int i = 0; i < octaves; i++) {
		freq *= 2.0;
		amp *= persistence;
		total += interpNoise2D(p.x * freq, p.y * freq) * amp;
	}

	return total;
}

#define cell_size 2.f

vec2 generate_point(vec2 cell) {
    vec2 p = vec2(cell.x, cell.y);
    p += fract(sin(vec2(dot(p, vec2(127.1f, 311.7f)), dot(p, vec2(269.5f, 183.3f)) * 43758.5453f)));
    return p * cell_size;
}

float worleyNoise(vec2 pixel) {
    vec2 cell = floor(pixel / cell_size);

    vec2 point = generate_point(cell);

    float shortest_distance = length(pixel - point);

   // compute shortest distance from cell + neighboring cell points

    for(float i = -1.0f; i <= 1.0f; i += 1.0f) {
        float ncell_x = cell.x + i;
        for(float j = -1.0f; j <= 1.0f; j += 1.0f) {
            float ncell_y = cell.y + j;

            // get the point for that cell
            vec2 npoint = generate_point(vec2(ncell_x, ncell_y));

            // compare to previous distances
            float distance = length(pixel - npoint);
            if(distance < shortest_distance) {
                shortest_distance = distance;
            }
        }
    }

    return shortest_distance / cell_size;
}

void main()
{	
	vec4 modelposition = vs_Pos;
	modelposition = u_Model * modelposition;

	vec2 coordinates = vec2(-vs_Pos.x, vs_Pos.z) / u_Dimensions;
	coordinates *= 2.;

	float height = pow(fbm2(2.f * coordinates + vec2(1.f, -0.4f)), 5.f);
	if(height > u_WaterLevel - 0.2 && height < u_WaterLevel + 0.2) {
		float interpolatedH = smoothstep(0., 0.5, height - u_WaterLevel);
		modelposition.y += interpolatedH;
	} else if (height >= u_WaterLevel + 0.2) {
		modelposition.y += 0.6;
	}

  	gl_Position = u_ViewProj * modelposition;

  	fs_Pos = vs_Pos.xyz;
  	fs_Nor = vs_Nor.xyz;

}
