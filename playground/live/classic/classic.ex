defmodule Playground.Live.Classic do
  @moduledoc """
  HTML module for the classic editor page of the playground application.
  """

  use Playground, :live_view
  use CKEditor5

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       editor_value: "<h1>Initial Content</h1><p>Try the buttons below.</p>",
       editor_focused?: false
     )}
  end

  @impl true
  def handle_event("preset_template", %{"type" => type}, socket) do
    content =
      case type do
        "clear" -> ""
        "work" -> "<h1>Daily Report</h1><p>Work on CKEditor integration is progressing well.</p>"
      end

    {:noreply, assign(socket, editor_value: content)}
  end

  @impl true
  def handle_event("force_set_data", %{"new_content" => val}, socket) do
    {:noreply, push_event(socket, "ckeditor5:set-data", %{editorId: "editor", data: val})}
  end

  @impl true
  def handle_event("ckeditor5:change", %{"data" => %{"main" => data}}, socket) do
    {:noreply, assign(socket, editor_value: data)}
  end

  @impl true
  def handle_event("ckeditor5:focus", _, socket) do
    {:noreply, assign(socket, editor_focused?: true)}
  end

  @impl true
  def handle_event("ckeditor5:blur", _, socket) do
    {:noreply, assign(socket, editor_focused?: false)}
  end
end
