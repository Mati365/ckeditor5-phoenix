defmodule CKEditor5.Upload.Controller do
  @moduledoc """
  Controller for handling image uploads from CKEditor 5.

  This controller provides a simple upload endpoint that saves uploaded files.

  ## Configuration

  You can configure the upload directory and the base URL for the uploaded files in your `config.exs`:

      config :ckeditor5_phoenix, :uploads,
        folder: "priv/static/uploads",
        url: "/uploads"

  ## Usage

  Add this to your router:

      scope "/api/ckeditor5" do
        post "/upload", CKEditor5.Upload.Controller, :upload
      end

  """

  use Phoenix.Controller

  @doc """
  Handles file upload from CKEditor 5.

  Expects a multipart/form-data request with a "file" parameter.
  Returns JSON with the uploaded file URL or an error message.
  """
  def upload(conn, %{"file" => upload}) do
    case save_upload(upload) do
      {:ok, url} ->
        json(conn, %{url: url})

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: %{message: reason}})
    end
  end

  def upload(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: %{message: "No file provided"}})
  end

  defp save_upload(%Plug.Upload{} = upload) do
    config = Application.fetch_env!(:ckeditor5_phoenix, :uploads)
    uploads_folder = Path.expand(config[:folder])
    uploads_url = config[:url]

    # Generate unique filename based on file hash.
    extension = Path.extname(upload.filename)
    hash = Base.encode16(:crypto.hash(:sha256, File.read!(upload.path)), case: :lower)
    filename = "#{hash}#{extension}"

    # Save file.
    destination = Path.join(uploads_folder, filename)

    File.mkdir_p!(uploads_folder)

    case File.cp(upload.path, destination) do
      :ok ->
        # Return URL to access the uploaded file.
        {:ok, "#{uploads_url}/#{filename}"}

      {:error, reason} ->
        {:error, "Failed to save file: #{inspect(reason)}"}
    end
  end

  defp save_upload(_), do: {:error, "Invalid file upload"}
end
