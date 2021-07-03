#version 300 es

uniform mat4 u_ViewProj;
uniform float u_Time;
uniform mat4 u_3DProj;

uniform mat3 u_CameraAxes; // Used for rendering particles as billboards (quads that are always looking at the camera)
// gl_Position = center + vs_Pos.x * camRight + vs_Pos.y * camUp;

in vec4 vs_Pos; // Non-instanced; each particle is the same quad drawn in a different place
in vec4 vs_Nor; // Non-instanced.
in vec2 vs_UV; // Non-instanced.

//in vec4 vs_Col; 	   // An instanced rendering attribute; each particle instance has a different color
in vec4  vs_Transform1; // Another instance rendering attribute; column 1 of transform matrix
in vec4  vs_Transform2; // Another instance rendering attribute; column 2 of transform matrix
in vec4  vs_Transform3; // Another instance rendering attribute; column 3 of transform matrix
in vec4  vs_Transform4; // Another instance rendering attribute; column 4 of transform matrix
in float vs_FloorType;  // Specific to the city generator; determines how the floors of the building are textured.

out vec4 fs_Pos;
out vec4 fs_Nor;
out vec2 fs_UV;
out float  fs_FloorType;

void main()
{	
    mat4 transform = mat4(vs_Transform1, vs_Transform2, vs_Transform3, vs_Transform4);
    
    fs_Pos = transform * vs_Pos;
    fs_Nor = transform * vs_Nor;
    fs_UV  = vs_UV;
    fs_FloorType = vs_FloorType;

	gl_Position = u_ViewProj * u_3DProj * transform * vs_Pos;
}
