defmodule Playground.Live.ImageUpload do
  @moduledoc """
  Demo page for CKEditor 5 with image upload functionality.
  """

  use Playground, :live_view
  use CKEditor5

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:content, "<p>Try uploading images using the image button in the toolbar!</p>")}
  end

  @impl true
  def handle_event("ckeditor5:change", %{"data" => data}, socket) do
    {:noreply, assign(socket, :content, data["main"])}
  end
end
