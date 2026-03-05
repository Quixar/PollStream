from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class ProfileUpdateForm(forms.ModelForm):

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name"]

    def clean_username(self):
        username = self.cleaned_data.get("username")

        if User.objects.exclude(pk=self.instance.pk).filter(username=username).exists():
            raise ValidationError("Username already exists")

        return username

    def clean_email(self):
        email = self.cleaned_data.get("email")

        if User.objects.exclude(pk=self.instance.pk).filter(email=email).exists():
            raise ValidationError("Email already in use")

        return email

class RegistrationForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, min_length=6)
    password_confirm = forms.CharField(widget=forms.PasswordInput, label="Confirm Password")

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def clean_username(self):
        username = self.cleaned_data.get("username")
        if User.objects.filter(username=username).exists():
            raise ValidationError("Username already exists")
        return username

    def clean_email(self):
        email = self.cleaned_data.get("email")
        if User.objects.filter(email=email).exists():
            raise ValidationError("Email is already in use")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")

        if password and password_confirm and password != password_confirm:
            self.add_error("password_confirm", "Passwords do not match")