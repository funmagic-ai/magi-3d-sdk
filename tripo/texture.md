Texture
Texture Model
Request
type: This field must be set to texture_model.

original_model_task_id: The task_id of a previous model.

Only the task IDs of the tasks below are supported:

text_to_model

image_to_model

multiview_to_model

texture_model

import_model

The model_version of previous task should be in (Turbo-v1.0-20250506, v2.0-20240919, v2.5-20250123, v3.0-20250812).

texture_prompt: If the model is generated via our api and processing after the supported tasks, this is optional.

text: Prompt text for texture image, mutually exclusive with image and images.
style_image (Optional): Allows you to provide a reference image to influence the artistic style of the generated model. The resolution of image must be between 20px and 6000px. The suggested resolution should be more than 256px
type: Indicates the file type. Although currently not validated, specifying the correct file type is strongly advised.
file_token: The identifier you get from upload, please read Docs/Upload. Mutually exclusive with url and object.
url: A direct URL to the image. Supports JPEG and PNG formats with maximum size of 20MB. Mutually exclusive with file_token and object.
object (Strongly Recommended): The information you get from upload (STS), please read Docs/Upload (STS). Mutually exclusive with url and file_token.
bucket: Normally should be tripo-data.
key: The resource_uri got from session token.
image: Prompt image for texture image, mutually exclusive with text and images. This can be specified as a file object like style_image, URL, or object, following the same format as other file inputs. The resolution of image must be between 20px and 6000px. The suggested resolution should be more than 256px.
images: Prompt image list for texture images, mutually exclusive with text and image. These can be specified as file objects like style_image. The list must contain exactly 4 items in the order [front, left, back, right]. You may omit certain input files by omitting the file_token, but the front input cannot be omitted. Do not use less than two images to generate. The resolution of each image must be between 20 x 20px and 6000 x 6000px. The suggested resolution should be more than 256 x 256px.
texture (Optional): A boolean option to enable texturing. The default value is true, set false to only update the pbr texture with pbr=true.

pbr (Optional): A boolean option to enable pbr. The default value is true, set false to get a model without pbr.

texture_seed (Optional): This is the random seed for texture generation. Using the same seed will produce identical textures. This parameter is an integer and is randomly chosen if not set.

texture_alignment (Optional): Determines the prioritization of texture alignment in the 3D model. The default value is original_image.

original_image: Prioritizes visual fidelity to the source image. This option produces textures that closely resemble the original image but may result in minor 3D inconsistencies.
geometry: Prioritizes 3D structural accuracy. This option ensures better alignment with the model’s geometry but may cause slight deviations from the original image appearance.
texture_quality (Optional): This parameter controls the texture quality. detailed provides high-resolution textures, resulting in more refined and realistic representation of intricate parts. This option is ideal for models where fine details are crucial for visual fidelity. The default value is standard.

When texture_quality = detailed, texture = false and pbr = false. It will upscale the texture on your model to 4K. Please note that PBR material will be removed. Only available for version v3.0-20250812.
When texture_quality = detailed, texture = false and pbr = true. It will generate pbr with current texture.
When texture_quality = detailed, texture = true and pbr = false. It will regenerate HD texture without pbr.
When texture_quality = detailed, texture = true and pbr = true. It will regenerate HD texture with pbr.
It’s not allowed when texture_quality = standard, texture = false and pbr = false.
part_names(Optional): The list of part names referred from Mesh Segmentation, the default value will be all part names generated from segmentation.

compress (Optional): Specifies the compression type to apply to the texture. Available values are:

geometry: Applies geometry-based compression to optimize the output, By default we use meshopt compression
model_version (Optional): Specifies the model version to use for texture generation. Available values are:

v2.5-20250123 (default)
v3.0-20250812
v2.0-20240919 (Deprecated)
bake (Optional): When set to true, bakes the model’s textures, combining advanced material effects into the base textures. The default value is true.

Response
task_id: The identifier for the successfully submitted task.
Behaviour
You can expect the same behaviour with text to model.

Example
Request:

Library:
curl
curl -X POST 'https://api.tripo3d.ai/v2/openapi/task' \
-H 'Content-Type: application/json' \
-H "Authorization: Bearer ${APIKEY}" \
-d '{"type": "texture_model", "original_model_task_id": "1ec04ced-4b87-44f6-a296-beee80777941"}'
Response:

{
  "code": 0,
  "data": {
    "task_id": "e3046989-e69d-4e0d-b192-7573227e3ce5"
  }
}
Errors
HTTP Status Code	Error Code	Description	Suggestion
429	2000	You have exceeded the limit of generation.	Please retry later.
For more infomation, please refer to Generation Rate Limit.
404	2001	Task not found.	The original model task does not exist or does not belong to the current user.
400	2002	The task type is unsupported.	Please check if you passed the correct task type.
400	2003	The input file is empty.	Please check if you passed file in texture_prompt, or it may be rejected by our firewall.
400	2004	The file type is unsupported.	Please check if the file format in texture_prompt is supported.
400	2006	The type of the input original task is invalid.	Please provide a valid task.
400	2007	The status of the original task is not success.	Use a successful original model task.
403	2010	You need more credits to start a new task.	Please reivew your usage at Billing and purchase more credits.
500	2014	Audit service error.	Content moderation service encountered an error. Please retry or contact support.
404	2019	File not found.	The referenced file in texture_prompt does not exist in storage. Please verify the file reference.