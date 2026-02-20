Generation
The overall endpoint is:

POST https://api.tripo3d.ai/v2/openapi/task
Image to Model
Request
type: This field must be set to image_to_model.

model_version (Optional): Model version. Available versions are as below:

Turbo-v1.0-20250506
v3.0-20250812
v2.5-20250123
v2.0-20240919
v1.4-20240625
v1.3-20240522 (Deprecated)
If this option is not set, the default value will be v2.5-20250123.

file: Specifies the image input. The resolution of each image must be between 20 x 20px and 6000 x 6000px. The suggested resolution should be more than 256 x 256px

type: Indicates the file type. Although currently not validated, specifying the correct file type is strongly advised.
file_token: The identifier you get from upload, please read Docs/Upload. Mutually exclusive with url and object.
url: A direct URL to the image. Supports JPEG and PNG formats with maximum size of 20MB. Mutually exclusive with file_token and object.
object (Strongly Recommended): The information you get from upload (STS), please read Docs/Upload (STS). Mutually exclusive with url and file_token.
bucket: Normally should be tripo-data.
key: The resource_uri got from session token.
model_seed (Optional): This is the random seed for model generation. For model_version>=v2.0-20240919, the seed controls the geometry generation process, ensuring identical models when the same seed is used. This parameter is an integer and is randomly chosen if not set.

enable_image_autofix (Optional): When set to true, it will optimize the input image to get better generation result. It will take longer time when request. The default value is false.

The options below are only valid for model_version>=v2.0-20240919

face_limit (Optional): Limits the number of faces on the output model. If this option is not set, the face limit will be adaptively determined. If smart_low_poly=true, it should be 1000~20000, if quad=true as well, it should be 500~10000.
texture (Optional): A boolean option to enable texturing. The default value is true, set false to get a base model without any textures.
pbr (Optional): A boolean option to enable pbr. The default value is true, set false to get a model without pbr. If this option is set to true, texture will be ignored and used as true.
texture_seed (Optional): This is the random seed for texture generation for model_version>=v2.0-20240919. Using the same seed will produce identical textures. This parameter is an integer and is randomly chosen if not set. If you want a model with different textures, please use same model_seed and different texture_seed.
texture_alignment (Optional): Determines the prioritization of texture alignment in the 3D model. The default value is original_image.
original_image: Prioritizes visual fidelity to the source image. This option produces textures that closely resemble the original image but may result in minor 3D inconsistencies.
geometry: Prioritizes 3D structural accuracy. This option ensures better alignment with the model’s geometry but may cause slight deviations from the original image appearance.
texture_quality (Optional): This parameter controls the texture quality. detailed provides high-resolution textures, resulting in more refined and realistic representation of intricate parts. This option is ideal for models where fine details are crucial for visual fidelity. The default value is standard.
auto_size (Optional): Automatically scale the model to real-world dimensions, with the unit in meters. The default value is false.
orientation (Optional): Set orientation=align_image to automatically rotate the model to align the original image. The default value is default.
quad (Optional): Set true to enable quad mesh output. If quad=true and face_limit is not set, the default face_limit will be 10000.
Note: Enabling this option will force the output to be an FBX model.
compress (Optional): Specifies the compression type to apply to the texture. Available values are:
geometry: Applies geometry-based compression to optimize the output, By Default we use meshopt compression
smart_low_poly (Optional): Generate low-poly meshes with hand‑crafted topology. Inputs with less complexity work best. There is a possibility of failure for complex models. The default value is false.
generate_parts (Optional): Generate segmented 3D models and make each part editable. The default value is false.
Note: generate_parts is not compatible with texture=true or pbr=true, if you want to generate parts, please set texture=false and pbr=false; generate_parts is not compatible with quad=true, if you want to generate parts, please set quad=false.
export_uv (Optional): Controls whether UV unwrapping is performed during generation. The default value is true. (When set to false, generation speed is significantly improved and model size is reduced. UV unwrapping will be handled during the texturing stage.)
The options below are only valid for model_version>=v3.0-20250812

geometry_quality (Optional):
Ultra Mode: Maximum detail for the most intricate and realistic models when setting to detailed
Standard Mode: Balanced detail and speed. The default value is standard
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
-d '{        "type": "image_to_model",
             "file": {
                       "type": "jpg",
                       "file_token": "***"
                     }
    }'
Response:

{
  "code": 0,
  "data": {
    "task_id": "1ec04ced-4b87-44f6-a296-beee80777941"
  }
}
Errors
HTTP Status Code	Error Code	Description	Suggestion
429	2000	You have exceeded the limit of generation.	Please retry later.
For more infomation, please refer to Generation Rate Limit.
404	2001	Task not found.	Please check if you passed the correct task id when using original_model_id.
400	2002	The task type is unsupported.	Please check if you passed the correct task type.
400	2003	The input file is empty.	Please check if you passed file, or it’s may rejected by our firewall.
400	2004	The file type is unsupported.	Please check if the file you input is supported.
400	2008	Task is rejected because the input violates our content policy.	Please modify your input and retry.
If you believe the input should be valid, please contact us.
403	2010	You need more credits to start a new task.	Please reivew your usage at Billing and purchase more credits.
500	2014	Audit service error.	Content moderation service encountered an error. Please retry or contact support.
400	2015	The version has been deprecated, please try higher version.	Try higher version please.
400	2017	Invalid model version.	The model_version parameter is invalid. Please check the available versions.
400	2018	The model is too complex to remesh	Try another model
404	2019	File not found.	The referenced file does not exist in storage. Please verify the file reference.
Text to Image
Request
type: Must be set to text_to_image.
prompt: Text input that directs the model generation.
The maximum prompt length is 1024 characters, equivalent to approximately 100 words.
The API supports multiple languages. However, emojis and certain special Unicode characters are not supported.
negative_prompt (Optional): Unlike prompt, it provides a reverse direction to assist in generating content contrasting with the original prompt. The maximum length is 255 characters.
Response
task_id: The identifier for the successfully submitted task.
Behaviour
Once the task moves out of the waiting queue, it typically completes within a few seconds.

Example
Request:

Library:
curl
export APIKEY="tsk_***"
curl https://api.tripo3d.ai/v2/openapi/task \
-H 'Content-Type: application/json' \
-H "Authorization: Bearer ${APIKEY}" \
-d '{"type": "text_to_image", "prompt": "a small cat"}'
unset APIKEY
Response:

{
  "code": 0,
  "data": {
    "task_id": "1ec04ced-4b87-44f6-a296-beee80777941"
  }
}
Errors
HTTP Status Code	Error Code	Description	Suggestion
429	2000	You have exceeded the limit of generation	Please retry later.
For more infomation, please refer to Generation Rate Limit.
400	2002	The task type is unsupported.	Please check if you passed the correct task type.
400	2008	Task is rejected because the input violates our content policy.	Please modify your input and retry.
If you believe the input should be valid, please contact us.
403	2010	You need more credits to start a new task.	Please reivew your usage at Billing and purchase more credits.
400	2015	The version has been deprecated, please try higher version.	Try higher version please.
400	2017	Invalid model version.	The model_version parameter is invalid. Please check the available versions.
Advanced Generate Image
The improved image generation task type, which supports image prompt and more detailed parameters.

Request
type: Must be set to generate_image.

model_version (Optional): Model version. Available versions are as below:

flux.1_kontext_pro (default)
flux.1_dev (unable to use with image file)
gpt_4o
gemini_2.5_flash_image_preview (also known as nano banana)
z_image (unable to use with image file)
prompt: Text input that directs the model generation.

The maximum prompt length is 1024 characters, equivalent to approximately 100 words.
The API supports multiple languages. However, emojis and certain special Unicode characters are not supported.
Multi-image Reference: When using multiple reference images via the files parameter, you can specify which image to reference using [image number] syntax in your prompt (e.g., “Use the style of image[1] with colors from image[2]”).
file (optional): Specifies the image input. The resolution of image must be between 20px and 6000px. The suggested resolution should be more than 256px.

type: Indicates the file type. Although currently not validated, specifying the correct file type is strongly advised.
file_token: The identifier you get from upload, please read Docs/Upload. Mutually exclusive with url and object.
url: A direct URL to the image. Supports JPEG and PNG formats with maximum size of 20MB. Mutually exclusive with file_token and object.
object (Strongly Recommended): The information you get from upload (STS), please read Docs/Upload (STS). Mutually exclusive with url and file_token.
bucket: Normally should be tripo-data.
key: The resource_uri got from session token.
files (optional): Specifies the image inputs, this is a list contains following parameters. For flux.1_kontext_pro, the max length of files is 4. For gpt_4o and gemini_2.5_flash_image_preview, the max length is 10. The resolution of each image must be between 20 x 20px and 6000 x 6000px. The suggested resolution should be more than 256 x 256px.

type: Indicates the file type. Although currently not validated, specifying the correct file type is strongly advised.
file_token: The identifier you get from upload, please read Docs/Upload. Mutually exclusive with url and object.
url: A direct URL to the image. Supports JPEG and PNG formats with maximum size of 20MB. Mutually exclusive with file_token and object.
object (Strongly Recommended): The information you get from upload (STS), please read Docs/Upload (STS). Mutually exclusive with url and file_token.
bucket: Normally should be tripo-data.
key: The resource_uri got from session token.
t_pose (optional): A bool value to transform your object to t pose while keeping main characteristics. The default value is false.

sketch_to_render (optional): A bool value to transform your sketch to a rendered image. The default value is false.

Response
task_id: The identifier for the successfully submitted task.
Behaviour
Once the task moves out of the waiting queue, it typically completes within a few seconds.

Example
Request:

Library:
curl
export APIKEY="tsk_***"
curl https://api.tripo3d.ai/v2/openapi/task \
-H 'Content-Type: application/json' \
-H "Authorization: Bearer ${APIKEY}" \
-d '{"type": "generate_image", "prompt": "a small cat"}'
unset APIKEY
Response:

{
  "code": 0,
  "data": {
    "task_id": "1ec04ced-4b87-44f6-a296-beee80777941"
  }
}
Errors
HTTP Status Code	Error Code	Description	Suggestion
429	2000	You have exceeded the limit of generation	Please retry later.
For more infomation, please refer to Generation Rate Limit.
400	2002	The task type is unsupported.	Please check if you passed the correct task type.
400	2008	Task is rejected because the input violates our content policy.	Please modify your input and retry.
If you believe the input should be valid, please contact us.
403	2010	You need more credits to start a new task.	Please reivew your usage at Billing and purchase more credits.
500	2014	Audit service error.	Content moderation service encountered an error. Please retry or contact support.
400	2015	The version has been deprecated, please try higher version.	Try higher version please.
400	2017	Invalid model version.	The model_version parameter is invalid. Please check the available versions.
404	2019	File not found.	The referenced file does not exist in storage. Please verify the file reference.
Text to Model
Request
type: Must be set to text_to_model.

model_version (Optional): Model version. Available versions are as below:

Turbo-v1.0-20250506
v3.0-20250812
v2.5-20250123
v2.0-20240919
v1.4-20240625
v1.3-20240522 (Deprecated)
If this option is not set, the default value will be v2.5-20250123.

prompt: Text input that directs the model generation.

The maximum prompt length is 1024 characters, equivalent to approximately 100 words.
The API supports multiple languages. However, emojis and certain special Unicode characters are not supported.
negative_prompt (Optional): Unlike prompt, it provides a reverse direction to assist in generating content contrasting with the original prompt. The maximum length is 255 characters.

image_seed (Optional): This is the random seed used for the process based on the prompt. This parameter is an integer and is randomly chosen if not set.

model_seed (Optional): This is the random seed for model generation. For model_version>=v2.0-20240919, the seed controls the geometry generation process, ensuring identical models when the same seed is used. This parameter is an integer and is randomly chosen if not set.

The options below are only valid for model_version>=v2.0-20240919

face_limit (Optional): Limits the number of faces on the output model. If this option is not set, the face limit will be adaptively determined. If smart_low_poly=true, it should be 1000~20000, if quad=true as well, it should be 500~10000.
texture : A boolean option to enable texturing. The default value is true, set false to get a base model without any textures.
pbr (Optional): A boolean option to enable pbr. The default value is true, set false to get a model without pbr. If this option is set to true, texture will be ignored and used as true.
texture_seed (Optional): This is the random seed for texture generation for model_version>=v2.0-20240919. Using the same seed will produce identical textures. This parameter is an integer and is randomly chosen if not set. If you want a model with different textures, please use same model_seed and different texture_seed.
texture_quality (Optional): This parameter controls the texture quality. detailed provides high-resolution textures, resulting in more refined and realistic representation of intricate parts. This option is ideal for models where fine details are crucial for visual fidelity. The default value is standard.
auto_size (Optional): Automatically scale the model to real-world dimensions, with the unit in meters. The default value is false.
quad (Optional): Set true to enable quad mesh output. If quad=true and face_limit is not set, the default face_limit will be 10000.
Note: Enabling this option will force the output to be an FBX model.
compress (Optional): Specifies the compression type to apply to the texture. Available values are:
geometry: Applies geometry-based compression to optimize the output, By default we use meshopt compression .
smart_low_poly (Optional): Generate low-poly meshes with hand‑crafted topology. Inputs with less complexity work best. There is a possibility of failure for complex models. The default value is false.
generate_parts (Optional): Generate segmented 3D models and make each part editable. The default value is false.
Note: generate_parts is not compatible with texture=true or pbr=true, if you want to generate parts, please set texture=false and pbr=false; generate_parts is not compatible with quad=true, if you want to generate parts, please set quad=false.
export_uv (Optional): Controls whether UV unwrapping is performed during generation. The default value is true. (When set to false, generation speed is significantly improved and model size is reduced. UV unwrapping will be handled during the texturing stage.)
The options below are only valid for model_version>=v3.0-20250812

geometry_quality (Optional):
Ultra Mode: Maximum detail for the most intricate and realistic models when setting to detailed
Standard Mode: Balanced detail and speed. The default value is standard
Response
task_id: The identifier for the successfully submitted task.
Behaviour
Once the task moves out of the waiting queue, it typically completes within a few seconds.

Below are options you can use to customize the behavior and appearance of models in your prompts.

Example
Request:

Library:
curl
export APIKEY="tsk_***"
curl https://api.tripo3d.ai/v2/openapi/task \
-H 'Content-Type: application/json' \
-H "Authorization: Bearer ${APIKEY}" \
-d '{"type": "text_to_model", "prompt": "a small cat"}'
unset APIKEY
Response:

{
  "code": 0,
  "data": {
    "task_id": "1ec04ced-4b87-44f6-a296-beee80777941"
  }
}
Errors
HTTP Status Code	Error Code	Description	Suggestion
429	2000	You have exceeded the limit of generation	Please retry later.
For more infomation, please refer to Generation Rate Limit.
404	2001	Task not found.	Please check if you passed the correct task id when using original_model_id.
400	2002	The task type is unsupported.	Please check if you passed the correct task type.
400	2008	Task is rejected because the input violates our content policy.	Please modify your input and retry.
If you believe the input should be valid, please contact us.
403	2010	You need more credits to start a new task.	Please reivew your usage at Billing and purchase more credits.
400	2015	The version has been deprecated, please try higher version.	Try higher version please.
400	2017	Invalid model version.	The model_version parameter is invalid. Please check the available versions.
400	2018	The model is too complex to remesh	Try another model
Multiview to Model
Request
type: This field must be set to multiview_to_model.

model_version (Optional): Model version. Available versions are as below:

v3.0-20250812
v2.5-20250123
v2.0-20240919
v1.4-20240625(Deprecated)
If this option is not set, the default value will be v2.5-20250123.

files: Specifies the image inputs, this is a list contains following parameters. The list must contain exactly 4 items in the order [front, left, back, right]. You may omit certain input files by omitting the file_token, but the front input cannot be omitted. Do not use less than two images to generate. The resolution of each image must be between 20 x 20px and 6000 x 6000px. The suggested resolution should be more than 256 x 256px

type: Indicates the file type. Although currently not validated, specifying the correct file type is strongly advised.
file_token: The identifier you get from upload, please read Docs/Upload. Mutually exclusive with url and object.
url: A direct URL to the image. Supports JPEG and PNG formats with maximum size of 20MB. Mutually exclusive with file_token and object.
object (Strongly Recommended): The information you get from upload (STS), please read Docs/Upload (STS). Mutually exclusive with url and file_token.
bucket: Normally should be tripo-data.
key: The resource_uri got from session token.
face_limit (Optional): Limits the number of faces on the output model. If this option is not set, the face limit will be adaptively determined. If smart_low_poly=true, it should be 1000~20000, if quad=true as well, it should be 500~10000.

texture (Optional): A boolean option to enable texturing. The default value is true, set false to get a base model without any textures.

pbr (Optional): A boolean option to enable pbr. The default value is true, set false to get a model without pbr. If this option is set to true, texture will be ignored and used as true.

texture_seed (Optional): This is the random seed for texture generation. Using the same seed will produce identical textures. This parameter is an integer and is randomly chosen if not set. If you want a model with different textures, please use same model_seed and different texture_seed.

texture_alignment (Optional): Determines the prioritization of texture alignment in the 3D model. The default value is original_image.

original_image: Prioritizes visual fidelity to the source image. This option produces textures that closely resemble the original image but may result in minor 3D inconsistencies.
geometry: Prioritizes 3D structural accuracy. This option ensures better alignment with the model’s geometry but may cause slight deviations from the original image appearance.
texture_quality (Optional): This parameter controls the texture quality. detailed provides high-resolution textures, resulting in more refined and realistic representation of intricate parts. This option is ideal for models where fine details are crucial for visual fidelity. The default value is standard.

auto_size (Optional): Automatically scale the model to real-world dimensions, with the unit in meters. The default value is false.

orientation (Optional): Set orientation=align_image to automatically rotate the model to align the original image. The default value is default.

quad (Optional): Set true to enable quad mesh output. If quad=true and face_limit is not set, the default face_limit will be 10000.

Note: Enabling this option will force the output to be an FBX model.
compress (Optional): Specifies the compression type to apply to the texture. Available values are:

geometry: Applies geometry-based compression to optimize the output, By default we use meshopt compression.
smart_low_poly (Optional): Generate low-poly meshes with hand‑crafted topology. Inputs with less complexity work best. There is a possibility of failure for complex models. The default value is false.

generate_parts (Optional): Generate segmented 3D models and make each part editable. The default value is false.

Note: generate_parts is not compatible with texture=true or pbr=true, if you want to generate parts, please set texture=false and pbr=false; generate_parts is not compatible with quad=true, if you want to generate parts, please set quad=false.
export_uv (Optional): Controls whether UV unwrapping is performed during generation. The default value is true. (When set to false, generation speed is significantly improved and model size is reduced. UV unwrapping will be handled during the texturing stage.)

Note: The directions of object in images should be [0°, 90°, 180°, 270°] and the object should be consistent among these images. left means the left arm of the input character for example.

front	left	back	right
			
The options below are only valid for model_version>=v3.0-20250812

geometry_quality (Optional):
Ultra Mode: Maximum detail for the most intricate and realistic models when setting to detailed
Standard Mode: Balanced detail and speed. The default value is standard
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
-d '{        "type": "multiview_to_model",
             "files": [
                     {
                       "type": "jpg",
                       "file_token": "***"
                     },
                     {},
                     {
                       "type": "jpg",
                       "file_token": "***"
                     },
                     {
                       "type": "jpeg",
                       "url": "***"
                     }
              ],
              "model_version": "v2.5-20250123"
    }'
Response:

{
  "code": 0,
  "data": {
    "task_id": "1ec04ced-4b87-44f6-a296-beee80777941"
  }
}
Errors
HTTP Status Code	Error Code	Description	Suggestion
429	2000	You have exceeded the limit of generation.	Please retry later.
For more infomation, please refer to Generation Rate Limit.
404	2001	Task not found.	Please check if you passed the correct task id when using original_model_id.
400	2002	The task type is unsupported.	Please check if you passed the correct task type.
400	2003	The input file is empty.	Please check if you passed file, or it’s may rejected by our firewall.
400	2004	The file type is unsupported.	Please check if the file you input is supported.
400	2008	Task is rejected because the input violates our content policy.	Please modify your input and retry.
If you believe the input should be valid, please contact us.
403	2010	You need more credits to start a new task.	Please reivew your usage at Billing and purchase more credits.
500	2014	Audit service error.	Content moderation service encountered an error. Please retry or contact support.
400	2015	The version has been deprecated, please try higher version.	Try higher version please.
400	2017	Invalid model version.	The model_version parameter is invalid. Please check the available versions.
400	2018	The model is too complex to remesh	Try another model
404	2019	File not found.	The referenced file does not exist in storage. Please verify the file reference.
Refine Model
Request
type: This field must be set to refine_model.
draft_model_task_id: The task_id of a draft model. Only the task IDs of the tasks below are supported:
text_to_model
image_to_model
multiview_to_model
Note: models of model_version>=v2.0-20240919 for refine is not supported.

Response
task_id: The identifier for the successfully submitted task.
Behaviour
The refinement process, being considerably more complex than initial drafting, yields a lower throughput and necessitates longer wait times, which are typically about 2 minutes in addition to queueing time.

We are actively enhancing our system to improve performance, which may cause these figures to vary over time. If you require increased throughput, please contact us for further assistance.

Example
Request:

Library:
curl
curl -X POST 'https://api.tripo3d.ai/v2/openapi/task' \
-H 'Content-Type: application/json' \
-H "Authorization: Bearer ${APIKEY}" \
-d '{"type": "refine_model", "draft_model_task_id": "1ec04ced-4b87-44f6-a296-beee80777941"}'
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
404	2001	Task not found.	The draft model task does not exist or does not belong to the current user.
400	2002	The task type is unsupported.	Please check if you passed the correct task type.
400	2006	The task is not a draft task.	Please use a draft model to start refine.
It is not supported to refine a model from a non-draft model, e.g., refine a model twice.
400	2007	The status of the draft task is not success.	Use a successful draft model task to refine.
403	2010	You need more credits to start a new task.	Please reivew your usage at Billing and purchase more credits.