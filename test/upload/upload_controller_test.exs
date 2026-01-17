defmodule CKEditor5.Upload.ControllerTest do
  use ExUnit.Case, async: false

  import Phoenix.ConnTest

  alias CKEditor5.Upload.Controller

  setup do
    # Create a temporary directory for uploads
    tmp_dir = System.tmp_dir!()
    uuid = Base.encode16(:crypto.strong_rand_bytes(8), case: :lower)
    upload_path = Path.join(tmp_dir, "ckeditor5_uploads_#{uuid}")
    File.mkdir_p!(upload_path)

    # Configure the application environment
    config = [folder: upload_path, url: "http://localhost/uploads"]
    original_config = Application.get_env(:ckeditor5_phoenix, :uploads)
    Application.put_env(:ckeditor5_phoenix, :uploads, config)

    on_exit(fn ->
      File.rm_rf!(upload_path)

      if original_config do
        Application.put_env(:ckeditor5_phoenix, :uploads, original_config)
      else
        Application.delete_env(:ckeditor5_phoenix, :uploads)
      end
    end)

    {:ok, upload_path: upload_path}
  end

  test "returns error when no file is provided" do
    conn = build_conn()
    conn = Controller.upload(conn, %{})

    assert json_response(conn, 400) == %{"error" => %{"message" => "No file provided"}}
  end

  test "uploads file successfully", %{upload_path: upload_path} do
    conn = build_conn()

    # Create a dummy file to upload
    filename = "image.png"
    file_content = "fake image content"
    src_path = Path.join(upload_path, "src_#{filename}")
    File.write!(src_path, file_content)

    upload = %Plug.Upload{
      path: src_path,
      filename: filename,
      content_type: "image/png"
    }

    conn = Controller.upload(conn, %{"file" => upload})

    response = json_response(conn, 200)
    assert Map.has_key?(response, "url")
    url = response["url"]
    assert url =~ "http://localhost/uploads/"

    # Verify file content
    uploaded_filename = Path.basename(url)
    dest_path = Path.join(upload_path, uploaded_filename)
    assert File.exists?(dest_path)
    assert File.read!(dest_path) == file_content
  end

  test "returns error when file upload fails logic", %{upload_path: _upload_path} do
    conn = build_conn()

    # This tests the catch-all save_upload(_) clause if we pass something that is not a Plug.Upload struct
    conn = Controller.upload(conn, %{"file" => "not-a-struct"})

    response = json_response(conn, 422)
    assert response == %{"error" => %{"message" => "Invalid file upload"}}
  end

  test "returns error when file copy fails", %{upload_path: upload_path} do
    # Remove the upload directory to force File.cp to fail
    File.rm_rf!(upload_path)

    conn = build_conn()

    # Need a source file that exists, so write it to tmp_dir instead of upload_path (which we just deleted)
    tmp_dir = System.tmp_dir!()
    filename = "fail_image.png"
    src_path = Path.join(tmp_dir, "src_#{filename}")
    File.write!(src_path, "content")

    upload = %Plug.Upload{
      path: src_path,
      filename: filename,
      content_type: "image/png"
    }

    conn = Controller.upload(conn, %{"file" => upload})

    response = json_response(conn, 422)
    message = response["error"]["message"]
    assert message =~ "Failed to save file"

    # Cleanup src file
    File.rm(src_path)
  end
end
