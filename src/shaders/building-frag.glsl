#version 300 es
precision highp float;

uniform vec3 u_Eye, u_Ref, u_Up;
const vec3 light_Vec = vec3(-1.0, 2.0, 0.0);

in vec3 fs_Pos;
in vec4 fs_Nor;
in vec4 fs_Col;
out vec4 out_Col;


void main()
{
    vec4 albedo = vec4(1., 0., 0., 1.);
	vec3 normal = fs_Nor.xyz;

	float lambert = clamp(dot(normalize(normal), normalize(light_Vec)), 0.0, 1.0);
	// Add ambient lighting
	float ambientTerm = 0.2;
	float lightIntensity = lambert + ambientTerm;
	//vec3 shadow = 0.3 * shadowColor * (1.0 - lightIntensity);
	//return vec4(clamp(base * lightIntensity + shadow, 0.0f, 1.0f), 1.0f);

	out_Col = albedo * lambert;
	out_Col.w = 1.;
}
