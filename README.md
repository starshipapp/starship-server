> [!WARNING]  
> Starship shut down Febuary 16th, 2025. See [the related blog post](https://blogs.mailliw.org/william341/the-end-of-starship) for more information.

# Starship (server)
This is the Apollo-based server for [Starship](starshipapp.xyz). The client can be found in another repository in this organization.

Please note that long periods of no/little commits does not mean the project is abandoned.

## Running
```
$ git clone https://github.com/starshipapp/starship-server --recurse-submodules
$ cd starship-server
$ npm install
$ cp example.env .env
$ npm run dev
```
You must change all uncommented variables in .env to point to valid locations and endpoints, including the S3 bucket. For testing, we recommend you use the "minio" server for this. Keep in mind that additional configuration is required to ensure that some locations in the bucket are publicly accessable. The following keys/folders must be set to be publicly accessable:
- `/mdattachments`
- `/customemojis`
- `/profilebanners`
- `/profilepictures`

If you encouter any issues, please create a Github issue report.
