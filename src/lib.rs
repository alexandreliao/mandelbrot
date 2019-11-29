use wasm_bindgen::prelude::*;

fn colorize(escape: u32) -> (u8, u8, u8) {
    const SLOW: f64 = 512.0;
    let ratio = (escape as f64 / SLOW).atan() / std::f64::consts::FRAC_PI_2;
    let h = ratio * 120.0;
    let s = 1.0;
    let l = ratio * 0.9;
    
    let (r, g, b) = hsl_to_rgb(h, s, l);
    
    (
        (r * 255.) as u8,
        (g * 255.) as u8,
        (b * 255.) as u8,
    )
}

fn transform(or: f64, oi: f64) -> (f64, f64) {
    // let norm_sqr = or * or + oi * oi;
    // (or / norm_sqr, -oi / norm_sqr)
    (or, oi)
}

fn hsl_to_rgb(h: f64, s: f64, l: f64) -> (f64, f64, f64) {
    let c = 1. - (l + l - 1.).abs() * s;
    let hp = h / 60.;
    let x = c * (1. - (hp % 2. - 1.).abs());
    
    let (r, g, b) = match hp as u8 {
        0 => (c, x, 0.),
        1 => (x, c, 0.),
        2 => (0., c, x),
        3 => (0., x, c),
        4 => (x, 0., c),
        5 => (c, 0., x),
        _ => (0., 0., 0.),
    };
    
    let m = l - c / 2.;
    (r + m, g + m, b + m)
}

// check whether point is in obvious mandelbulb
fn in_mandelbulb(cr: f64, ci: f64) -> bool {
    // check rect
    let ci_sqr = ci * ci;
    if cr < -1.25 || cr > 0.375 || ci_sqr > 0.421875 {
        return false;
    }
    
    // check whether point in in main bulb
    let cr_minus_fourth = cr - 0.25;
    let q = cr_minus_fourth * cr_minus_fourth + ci_sqr;
    if q * (q + cr_minus_fourth) < 0.25 * ci_sqr {
        return true;
    }

    // check whether point in 2nd bulb
    let cr_plus_one = cr + 1.;
    if cr_plus_one * cr_plus_one + ci_sqr < 0.0625 {
        return true;
    }
    
    false
}

fn mandelbrot_escape(cr: f64, ci: f64, iterations: u32) -> u32 {
    // actual algorithm starts here
    let mut zr = cr;
    let mut zi = ci;
    
    let mut zr_sqr;
    let mut zi_sqr;
    
    for i in 1..=iterations {
        // check for escape
        zr_sqr = zr.powi(2);
        zi_sqr = zi.powi(2);
        
        if zr_sqr + zi_sqr > 4. {
            return i;
        }
        
        // iterate
        zi = zr * zi;
        zi += zi;
        zi += ci;
        
        zr = zr_sqr - zi_sqr + cr;
    }

    0
}

#[wasm_bindgen]
pub struct Mandelbrot {
    render_width: usize,
    render_height: usize,
    colors: Vec<u8>,
}

#[wasm_bindgen]
impl Mandelbrot {
    pub fn new(
        render_width: usize,
        render_height: usize,
    ) -> Mandelbrot {
        Mandelbrot {
            render_width,
            render_height,
            colors: vec![0; 4 * render_width * render_height],
        }
    }
    
    pub fn set_render_size(&mut self, render_width: usize, render_height: usize) {
        self.render_width = render_width;
        self.render_height = render_height;
        
        let pixels = render_width * render_height;
        
        if self.colors.len() < 4 * pixels {
            self.colors.resize(4 * pixels, 0);
        }
    }

    pub fn clear(&mut self) {
        for i in 0..self.render_width * self.render_height {
            self.colors[4 * i + 0] = 0;
            self.colors[4 * i + 1] = 0;
            self.colors[4 * i + 2] = 0;
            self.colors[4 * i + 3] = 255;
        }
    }
    
    pub fn colors(&self) -> *const u8 {
        self.colors.as_ptr()
    }

    pub fn draw(
        &mut self,
        top: f64,
        left: f64,
        width: f64,
        height: f64,
        iterations: u32,
        interlace_count: usize,
        interlace_step: usize,
    ) {
        let delta_x = width / self.render_width as f64;
        let delta_y = height / self.render_height as f64;
        
        for idx in (interlace_step..self.render_width * self.render_height).step_by(interlace_count) {
            let row = idx / self.render_width;
            let col = idx % self.render_width;
            
            let x = left + col as f64 * delta_x;
            let y = top - row as f64 * delta_y;
            
            let (r, i) = transform(x, y);
            
            let escape = if in_mandelbulb(r, i) { 0 } // 0 is the code for escape
                else { mandelbrot_escape(r, i, iterations) };
            
            let (r, g, b) = colorize(escape);
    
            self.colors[4 * idx] = r;
            self.colors[4 * idx + 1] = g;
            self.colors[4 * idx + 2] = b;
            self.colors[4 * idx + 3] = 255;
        }
    }
}
