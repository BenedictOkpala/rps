import type { CSSProperties } from "react";
import type { Hand } from "./game";

export type HandState = "idle" | "shake" | Hand | "cheating" | "resolved";
type HandProps = { gesture: Hand; state: HandState; side: "you" | "ai" };

// Every digit keeps the same SVG node and matching cubic-curve commands.
// CSS interpolates its geometry in place, including during the AI's late swap.
const FINGERS: Record<Hand, readonly string[]> = {
  rock: [
    "M164 98 C179 88 211 86 224 96 C237 105 238 124 228 132 C219 141 184 135 167 133 C160 126 158 106 164 98 Z",
    "M174 119 C190 112 225 110 237 120 C249 130 247 146 237 152 C224 158 191 151 176 150 C169 143 168 128 174 119 Z",
    "M176 143 C190 137 224 137 235 147 C244 156 241 169 231 175 C219 181 192 174 178 172 C171 165 169 151 176 143 Z",
    "M167 165 C182 159 211 162 221 170 C232 179 229 192 218 198 C204 203 182 194 169 190 C164 184 162 172 167 165 Z",
  ],
  paper: [
    "M161 96 C187 89 279 77 305 78 C324 79 327 96 309 101 C279 109 191 119 165 122 C157 117 154 102 161 96 Z",
    "M174 121 C202 113 302 105 325 107 C344 109 345 127 326 130 C293 135 200 144 176 145 C169 139 168 128 174 121 Z",
    "M174 147 C202 141 290 139 312 142 C330 144 329 161 311 164 C283 168 201 172 177 170 C170 165 168 154 174 147 Z",
    "M164 170 C188 169 264 176 282 181 C299 186 295 202 279 201 C254 199 188 197 168 192 C161 186 159 177 164 170 Z",
  ],
  scissors: [
    "M162 97 C185 83 269 44 292 40 C310 38 316 55 300 64 C274 79 195 117 168 125 C158 121 154 105 162 97 Z",
    "M174 120 C203 113 299 111 321 114 C340 117 339 135 321 138 C290 140 202 146 177 147 C169 142 168 129 174 120 Z",
    "M176 145 C190 139 224 139 235 149 C244 158 241 171 231 177 C219 183 192 176 178 174 C171 167 169 153 176 145 Z",
    "M167 166 C182 160 211 163 221 171 C232 180 229 193 218 199 C204 204 182 195 169 191 C164 185 162 173 167 166 Z",
  ],
};
const THUMB: Record<Hand, string> = {
  rock: "M120 111 C128 89 153 87 170 100 C181 109 195 123 204 137 C213 153 201 166 187 157 C173 148 162 130 151 128 C136 129 125 126 120 111 Z",
  paper: "M118 111 C116 93 118 59 132 55 C150 50 153 67 151 82 C149 102 164 112 175 127 C185 141 174 151 160 143 C141 135 125 127 118 111 Z",
  scissors: "M120 113 C128 94 150 92 167 108 C180 121 188 137 197 150 C206 166 192 176 180 166 C164 153 158 137 148 132 C133 132 124 128 120 113 Z",
};
function shapeStyle(path: string): CSSProperties {
  return { d: `path("${path}")` } as CSSProperties;
}
export function HandVisual({ gesture, state, side }: HandProps) {
  return (
    <div className={`hand-motion ${side} ${state}`} data-state={state} data-gesture={gesture}>
      <svg className="hand" viewBox="0 0 360 260" role="img" aria-label={`${side === "you" ? "Your" : "AI"} hand: ${gesture}`}>
        <g className="hand-facing">
          <ellipse className="table-shadow" cx="174" cy="229" rx="127" ry="10" />
          <g className="hand-body" strokeLinejoin="round" strokeLinecap="round">
            <path className="skin-depth" d="M18 137 107 128 C122 116 136 112 155 119 L180 171 C176 197 154 210 115 206 L18 220 Z" />
            <path className="skin" d="M18 127 106 119 C123 106 136 102 155 109 L180 162 C176 189 152 202 114 197 L18 210 Z" />
            <path className="skin-light" d="M19 129 106 121 131 110 142 116 112 134 19 143 Z" />
            <path className="palm-depth" d="M104 126 C114 104 141 88 168 97 C198 105 213 130 212 155 C210 184 185 205 155 205 C132 205 114 192 109 179 Z" />
            {FINGERS[gesture].map((path, index) => (
              <g className={`digit digit-${index}`} key={index}>
                <path className="skin-depth morph" d={path} style={shapeStyle(path)} transform="translate(0 6)" />
                <path className="skin finger-surface morph" d={path} style={shapeStyle(path)} />
              </g>
            ))}
            <path className="skin" d="M106 120 C119 101 142 92 162 99 C179 110 186 129 187 154 C190 181 177 197 153 197 C128 196 111 184 109 163 Z" />
            <path className="skin-light" d="M111 121 C126 108 143 101 158 107 L165 116 C143 112 127 120 115 137 Z" />
            <path className="palm-plane" d="M112 162 C132 180 151 188 177 178 C171 194 158 199 143 194 C125 191 114 180 112 162 Z" />
            <path className="crease" d="M129 148 C139 145 152 150 158 161 M115 173 121 179" />
            <path className="skin-depth morph" d={THUMB[gesture]} style={shapeStyle(THUMB[gesture])} transform="translate(0 5)" />
            <path className="skin thumb-surface morph" d={THUMB[gesture]} style={shapeStyle(THUMB[gesture])} />
            <path className="cuff-depth" d="M13 124 65 119 76 208 18 218 Z" />
            <path className="cuff" d="M13 119 59 115 70 202 18 211 Z" />
            <path className="cuff-edge" d="M53 116 59 115 70 202 64 203 Z" />
            <path className="cuff-seam" d="M22 130 47 127 M25 193 57 188" />
          </g>
        </g>
      </svg>
    </div>
  );
}
