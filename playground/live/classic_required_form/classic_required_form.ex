defmodule Playground.Live.ClassicRequiredForm do
  @moduledoc """
  LiveView for demonstrating CKEditor5 Classic integration with a required field in a form.
  """

  alias Phoenix.Component

  use Playground, :live_view
  use CKEditor5

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       saved: false,
       form: Component.to_form(%{"content" => ""}, as: :form)
     )}
  end

  @impl true
  def handle_event("save", %{"form" => form_params}, socket) do
    content = form_params["content"] || ""

    if String.trim(content) != "" do
      {:noreply, assign(socket, saved: true, form: Component.to_form(form_params, as: :form))}
    else
      {:noreply, assign(socket, saved: false)}
    end
  end
end
