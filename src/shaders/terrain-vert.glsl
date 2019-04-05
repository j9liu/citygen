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
out vec4 fs_Nor;

/* NOISE FUNCTIONS */

float noise(float i) {
	return fract(sin(vec2(203.311f * float(i), float(i) * sin(0.324f + 140.0f * float(i))))).x;
}

float random(vec2 p, vec2 seed) {
  return fract(sin(dot(p + seed, vec2(127.1, 311.7))) * 43758.5453);
}

float interpNoise1D(float x) {
	float intX = floor(x);	
	float fractX = fract(x);

	float v1 = noise(intX);
	float v2 = noise(intX + 1.0f);
	return mix(v1, v2, fractX);
}

float fbm(float x) {
	float total = 0.0f;
	float persistence = 0.5f;
	int octaves = 8;

	for(int i = 0; i < octaves; i++) {
		float freq = pow(2.0f, float(i));
		float amp = pow(persistence, float(i));

		total += interpNoise1D(x * freq) * amp;
	}

	return total;
}

float interpNoise2D(float x, float y) {
	float intX = floor(x);
	float fractX = fract(x);
	float intY = floor(y);
	float fractY = fract(y);

	float v1 = random(vec2(intX, intY), vec2(0));
	float v2 = random(vec2(intX + 1.0f, intY), vec2(0));
	float v3 = random(vec2(intX, intY + 1.0f), vec2(0));
	float v4 = random(vec2(intX + 1.0f, intY + 1.0f), vec2(0));

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

void main()
{	
	vec2 coordinates = vec2(vs_Pos.x, vs_Pos.z) / u_Dimensions;
    float height = pow(fbm2(2.f * coordinates + vec2(1., -0.4)), 5.);
	vec4 modelposition = vs_Pos;
	if(height > u_WaterLevel) {
		modelposition.y += 0.5;
	}
	modelposition = u_Model * modelposition;
  	gl_Position = u_ViewProj * modelposition;
  	fs_Pos = modelposition.xyz;
  	fs_Nor = u_ViewProj * u_Model * fs_Nor;
    fs_Col = vs_Col;
}
