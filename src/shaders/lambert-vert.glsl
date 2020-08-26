#version 300 es

uniform mat4 u_Model;
uniform mat4 u_ViewProj;

in vec4 vs_Pos;
in vec4 vs_Nor;
in vec4 vs_Col;

out vec3 fs_Pos;
out vec4 fs_Nor;

void main()
{	
	vec4 modelposition = vs_Pos;
	modelposition = u_Model * modelposition;

  	gl_Position = u_ViewProj * modelposition;

  	fs_Pos = vs_Pos.xyz;
  	fs_Nor = u_ViewProj * u_Model * vs_Nor;
}
