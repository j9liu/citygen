#version 300 es

uniform mat4 u_ViewProj;
uniform float u_Time;
uniform mat4 u_3DProj;

uniform mat3 u_CameraAxes; // Used for rendering particles as billboards (quads that are always looking at the camera)
// gl_Position = center + vs_Pos.x * camRight + vs_Pos.y * camUp;

in vec4 vs_Pos; // Non-instanced; each particle is the same quad drawn in a different place
in vec4 vs_Nor; // Non-instanced, and presently unused
in vec4 vs_Col; // An instanced rendering attribute; each particle instance has a different color
in vec4 vs_Transform1; // Another instance rendering attribute; column 1 of transform matrix
in vec4 vs_Transform2; // Another instance rendering attribute; column 2 of transform matrix
in vec4 vs_Transform3; // Another instance rendering attribute; column 3 of transform matrix
in vec4 vs_Transform4; 
in vec2 vs_UV; // Non-instanced, and presently unused in main(). Feel free to use it for your meshes.

out vec4 fs_Col;

void main()
{	
    mat4 transform = mat4(vs_Transform1, vs_Transform2, vs_Transform3, vs_Transform4);
    gl_Position = u_ViewProj * u_3DProj * transform * vs_Pos;

    fs_Col = vs_Col;
}
