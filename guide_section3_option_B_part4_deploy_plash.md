### Subsection 3.3: Deploying the Slideshow Webpage

For Plash to use your `slideshow.html` and `pexels_photo_urls.txt` files, they need to be hosted somewhere on the web so they can be accessed via a URL. Here are a couple of options:

#### Option 3.3.1: I Can Deploy It For You (Simple & Quick)

As your AI assistant, I can deploy this simple static slideshow (the `slideshow.html` and your `pexels_photo_urls.txt` file) for you. This will give you a public URL that you can then paste into Plash.

*   **What you need to provide me:** If you choose this option, you would need to send me the `pexels_photo_urls.txt` file that contains the URLs of your photos.
*   **How it works:** I will create a small static website deployment containing your `slideshow.html` (using the template I provided) and your `pexels_photo_urls.txt`. I will then give you the public URL.
*   **Considerations:** This URL will be publicly accessible, though it will be a somewhat obscure link. Only people with the direct URL would typically find it. The deployment would be for this specific set of photos. If you update your photo list later, the deployment would need to be updated.

**If you would like me to deploy the slideshow for you, please let me know and provide the `pexels_photo_urls.txt` file.**

#### Option 3.3.2: Guide to Self-Deployment (More Control)

If you prefer to host the files yourself, there are many free or easy ways to deploy static websites. Here are a couple of popular options:

**A. Netlify Drop (Very Easy):**

1.  **Prepare your files:** Create a folder on your computer (e.g., `MyPexelsSlideshow`). Place both `slideshow.html` and `pexels_photo_urls.txt` inside this folder.
2.  **Go to Netlify Drop:** Open your web browser and navigate to [app.netlify.com/drop](https://app.netlify.com/drop).
3.  **Drag and Drop:** Drag the `MyPexelsSlideshow` folder from your computer directly onto the Netlify Drop webpage.
4.  **Deployed!** Netlify will automatically upload your files and assign you a random public URL (e.g., `random-name-12345.netlify.app`). Your slideshow will be live at `random-name-12345.netlify.app/slideshow.html`.
5.  **Custom Domain (Optional):** Netlify allows you to change the `random-name` part of the URL to something more memorable if it's available, or even use your own custom domain if you have one.

**B. GitHub Pages (Good if you use GitHub):**

1.  **Create a GitHub Repository:**
    *   If you don't have a GitHub account, create one at [github.com](https://github.com/).
    *   Create a new public repository (e.g., `my-pexels-wallpaper`).
2.  **Upload Your Files:**
    *   Upload `slideshow.html` and `pexels_photo_urls.txt` to this new repository.
3.  **Enable GitHub Pages:**
    *   In your repository on GitHub, go to "Settings".
    *   Scroll down to the "Pages" section in the left sidebar.
    *   Under "Source," select the branch you want to deploy from (usually `main` or `master`) and the folder (usually `/root`). Click "Save".
4.  **Access Your Site:** GitHub will provide you with a URL where your site is published (e.g., `yourusername.github.io/my-pexels-wallpaper/slideshow.html`). It might take a few minutes for the site to become live after enabling GitHub Pages.

**C. Other Options:**

Many other platforms offer free static site hosting, such as Vercel, Cloudflare Pages, or even simple object storage services like AWS S3 (though S3 is more complex to set up for public website hosting).

Once you have deployed your `slideshow.html` and `pexels_photo_urls.txt` files and have a public URL for `slideshow.html`, you are ready to set it up in Plash.

### Subsection 3.4: Setting up the Custom Slideshow in Plash

This is very similar to Option A, but you will use the URL of your newly deployed `slideshow.html` page.

1.  **Get Your Slideshow URL:** This is the URL you obtained from deploying your slideshow (e.g., `https://random-name-12345.netlify.app/slideshow.html` or `https://yourusername.github.io/my-pexels-wallpaper/slideshow.html`).
2.  **Open Plash Preferences:** Launch Plash. Click its menu bar icon and open preferences/settings.
3.  **Enter the URL:** Paste your custom slideshow URL into Plash's URL field.
4.  **Enjoy!** Plash will now load your custom webpage, which will display your Pexels photos as a full-screen, automatically refreshing wallpaper.

*(The next sections will cover configuring Plash for optimal refresh and some troubleshooting tips.)*
